import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  branchTitle,
  deleteSession,
  deriveTitle,
  isMissingSession,
  loadSession,
  newSessionId,
  rootTitle,
  streamChat,
} from "@/api/client";
import { hydrateSession, sessionKeys, useSessions } from "@/api/sessions";
import {
  emptyState,
  type ActivityItem,
  type ChatResponse,
  type ConversationState,
  type SessionSummary,
} from "@/api/types";
import { applyStepToTrace, buildResponseFrom, emptyResponse, type StepClock } from "./agent-bridge";
import type { AgentResponse } from "./campus-agents";

export type UserMessage = { id: string; role: "user"; text: string; at: number };
export type AssistantMessage = {
  id: string;
  role: "assistant";
  /** The question that produced this turn — the bridge needs it for routing. */
  question: string;
  response: AgentResponse;
  /** "thinking" until the first answer text lands, then "done". */
  phase: "thinking" | "done";
  statusStep: number;
  streaming: boolean;
  /** Raw answer text; `response.body` is derived from it. */
  answer: string;
  activity: ActivityItem[];
  reasoning: string;
  error: string | null;
  at: number;
};
export type Message = UserMessage | AssistantMessage;

export type Thread = {
  /** Also the backend `session_id`. `ui-<uuid>`. */
  id: string;
  title: string;
  parentId: string | null;
  createdAt: number;
  messages: Message[];
  /** Client-held agent memory, echoed back on every turn. */
  state: ConversationState;
  /** The backend has acknowledged at least one turn in this session. */
  persisted: boolean;
  /** Messages reflect the server's copy (or the thread was created here). */
  loaded: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);

const STREAM_ENDED_EARLY = "The response stream ended before completing. Please try again.";

function newThread(): Thread {
  return {
    id: newSessionId(),
    title: "New session",
    parentId: null,
    createdAt: Date.now(),
    messages: [],
    state: emptyState(),
    persisted: false,
    loaded: true,
  };
}

function stubFrom(summary: SessionSummary): Thread {
  const created = Date.parse(summary.created_at);
  return {
    id: summary.session_id,
    title: summary.title || "Untitled session",
    parentId: summary.parent_session_id,
    createdAt: Number.isNaN(created) ? Date.now() : created,
    messages: [],
    state: emptyState(),
    persisted: true,
    loaded: false,
  };
}

/** Trim agent memory to the first `count` turns, for edits and branches. */
function truncateState(state: ConversationState, count: number): ConversationState {
  return { ...state, turns: state.turns.slice(0, count) };
}

type ChatContextValue = {
  educatorId: string | null;
  signIn: (id: string) => void;
  signOut: () => void;
  threads: Thread[];
  historyLoading: boolean;
  createThread: () => string;
  branchFrom: (threadId: string, messageId: string) => string;
  deleteThread: (threadId: string) => void;
  getThread: (threadId: string) => Thread | undefined;
  /** Pull a session's messages from the backend if we don't have them yet. */
  openThread: (threadId: string) => void;
  send: (threadId: string, text: string) => void;
  stop: () => void;
  editMessage: (threadId: string, messageId: string, text: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  busyThreadId: string | null;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [educatorId, setEducatorId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [draft, setDraft] = useState("");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const sessions = useSessions(educatorId);

  // `send` and `openThread` read threads asynchronously, long after the closure
  // that captured them was created.
  const threadsRef = useRef<Thread[]>(threads);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => () => abortRef.current?.abort(), []);

  // Merge the server's session list in as unhydrated stubs. Threads we already
  // hold win — a stub would wipe an in-flight conversation.
  useEffect(() => {
    const list = sessions.data;
    if (!list || list.length === 0) return;
    setThreads((prev) => {
      const known = new Set(prev.map((t) => t.id));
      const stubs = list.filter((s) => !known.has(s.session_id)).map(stubFrom);
      if (stubs.length === 0) return prev;
      return [...prev, ...stubs].sort((a, b) => b.createdAt - a.createdAt);
    });
  }, [sessions.data]);

  const patchThread = useCallback((threadId: string, fn: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? fn(t) : t)));
  }, []);

  const createThread = useCallback(() => {
    const thread = newThread();
    setThreads((prev) => [thread, ...prev]);
    return thread.id;
  }, []);

  const getThread = useCallback(
    (threadId: string) => threads.find((t) => t.id === threadId),
    [threads],
  );

  const openThread = useCallback(
    (threadId: string) => {
      const lecturerId = educatorId;
      if (!lecturerId) return;
      const thread = threadsRef.current.find((t) => t.id === threadId);
      if (!thread || thread.loaded || loadingRef.current.has(threadId)) return;

      loadingRef.current.add(threadId);
      void (async () => {
        try {
          const blob = await loadSession(lecturerId, threadId);
          const hydrated = hydrateSession(blob);
          const messages: Message[] = [];
          let lastQuestion = "";

          for (const turn of hydrated) {
            if (turn.role === "user") {
              lastQuestion = turn.content;
              messages.push({ id: uid(), role: "user", text: turn.content, at: 0 });
              continue;
            }
            messages.push({
              id: uid(),
              role: "assistant",
              question: lastQuestion,
              response: buildResponseFrom({
                question: lastQuestion,
                answer: turn.content,
                activity: turn.activity,
                final: {
                  session_id: blob.session_id,
                  answer: turn.content,
                  citations: turn.citations,
                  route_taken: "",
                  state: blob.state,
                  agent_version: "",
                },
                state: blob.state,
              }),
              phase: "done",
              statusStep: Math.max(0, turn.activity.length - 1),
              streaming: false,
              answer: turn.content,
              activity: turn.activity,
              reasoning: turn.reasoning ?? "",
              error: null,
              at: 0,
            });
          }

          setThreads((prev) =>
            prev.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    title: blob.title || t.title,
                    parentId: blob.parent_session_id ?? t.parentId,
                    messages,
                    state: blob.state ?? emptyState(),
                    persisted: true,
                    loaded: true,
                  }
                : t,
            ),
          );
        } catch (err) {
          if (isMissingSession(err)) {
            setThreads((prev) => prev.filter((t) => t.id !== threadId));
          } else {
            toast.error("Couldn't load that conversation", {
              description: err instanceof Error ? err.message : String(err),
            });
          }
        } finally {
          loadingRef.current.delete(threadId);
        }
      })();
    },
    [educatorId],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      const thread = threadsRef.current.find((t) => t.id === threadId);
      const doomed = new Set([threadId]);
      for (const t of threadsRef.current) if (t.parentId === threadId) doomed.add(t.id);

      setThreads((prev) => prev.filter((t) => !doomed.has(t.id)));

      const lecturerId = educatorId;
      if (!lecturerId || !thread?.persisted) return;
      void (async () => {
        for (const id of doomed) {
          try {
            await deleteSession(lecturerId, id);
          } catch (err) {
            if (!isMissingSession(err)) {
              toast.error("Couldn't delete that conversation on the server", {
                description: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all(lecturerId) });
      })();
    },
    [educatorId, queryClient],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusyThreadId(null);
    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        messages: t.messages.map((m) =>
          m.role === "assistant" && m.streaming
            ? {
                ...m,
                streaming: false,
                phase: "done" as const,
                error: m.answer ? null : "Stopped.",
              }
            : m,
        ),
      })),
    );
  }, []);

  /**
   * Run one turn against the agent.
   *
   * `stateOverride` exists for edits and branches, where the memory we send is
   * a truncated copy rather than whatever the thread currently holds.
   */
  const run = useCallback(
    (
      threadId: string,
      text: string,
      options?: { stateOverride?: ConversationState; announceSession?: boolean },
    ) => {
      const lecturerId = educatorId;
      if (!lecturerId) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const thread = threadsRef.current.find((t) => t.id === threadId);
      if (!thread) return;

      // One stream at a time — the composer is disabled on `busyThreadId`, and
      // a second stream would leave the first message stuck mid-flight.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const outboundState = options?.stateOverride ?? thread.state;
      const userMsg: UserMessage = { id: uid(), role: "user", text: trimmed, at: Date.now() };
      const assistantId = uid();
      const assistantMsg: AssistantMessage = {
        id: assistantId,
        role: "assistant",
        question: trimmed,
        response: emptyResponse(trimmed),
        phase: "thinking",
        statusStep: 0,
        streaming: true,
        answer: "",
        activity: [],
        reasoning: "",
        error: null,
        at: Date.now(),
      };

      const isFirstTurn = thread.messages.length === 0;
      const title = isFirstTurn && !thread.parentId ? deriveTitle(trimmed) : thread.title;

      setBusyThreadId(threadId);
      patchThread(threadId, (t) => ({
        ...t,
        title,
        state: outboundState,
        messages: [...t.messages, userMsg, assistantMsg],
      }));

      const patch = (fn: (m: AssistantMessage) => AssistantMessage) =>
        patchThread(threadId, (t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === assistantId && m.role === "assistant" ? fn(m) : m,
          ),
        }));

      /** Recompute the rendered response from raw stream state. */
      const reproject = (m: AssistantMessage, final?: ChatResponse): AssistantMessage => ({
        ...m,
        response: buildResponseFrom({
          question: m.question,
          answer: m.answer,
          activity: m.activity,
          ...(final === undefined ? {} : { final }),
        }),
        statusStep: Math.max(0, m.activity.filter((i) => "name" in i).length - 1),
        phase: m.answer.trim() || m.activity.length > 0 ? "done" : "thinking",
      });

      void (async () => {
        const clock: StepClock = new Map();
        // [ref] The backend restarts the answer after a step boundary: the
        // first token following `step: start` replaces everything accumulated
        // so far, and the discarded text becomes narration.
        let resetOnNextToken = false;
        let terminated = false;

        try {
          const request = {
            lecturer_id: lecturerId,
            message: trimmed,
            session_id: threadId,
            state: outboundState,
            ...(options?.announceSession && thread.parentId
              ? { title: thread.title, parent_session_id: thread.parentId }
              : {}),
          };

          for await (const frame of streamChat(request, controller.signal)) {
            if (frame.type === "token") {
              const text = String((frame as { text?: unknown }).text ?? "");
              const reset = resetOnNextToken;
              resetOnNextToken = false;
              patch((m) => reproject({ ...m, answer: (reset ? "" : m.answer) + text }));
            } else if (frame.type === "reasoning") {
              const text = String((frame as { text?: unknown }).text ?? "");
              patch((m) => ({ ...m, reasoning: m.reasoning + text }));
            } else if (frame.type === "step") {
              const step = frame as import("@/api/types").StepFrame;
              if (step.phase === "start") resetOnNextToken = true;
              patch((m) => {
                let activity = m.activity;
                let answer = m.answer;
                if (step.phase === "start" && answer.trim()) {
                  activity = [...activity, { kind: "narration", text: answer }];
                  answer = "";
                }
                return reproject({
                  ...m,
                  answer,
                  activity: applyStepToTrace(activity, step, clock),
                });
              });
            } else if (frame.type === "final") {
              terminated = true;
              const final = (frame as { response: ChatResponse }).response;
              patchThread(threadId, (t) => ({
                ...t,
                state: final.state ?? t.state,
                persisted: true,
                messages: t.messages.map((m) =>
                  m.id === assistantId && m.role === "assistant"
                    ? {
                        ...reproject(
                          {
                            ...m,
                            answer: m.answer.trim() ? m.answer : final.answer,
                            activity: m.activity.map((item) =>
                              "kind" in item ? item : { ...item, done: true },
                            ),
                          },
                          final,
                        ),
                        streaming: false,
                        phase: "done" as const,
                      }
                    : m,
                ),
              }));
            } else if (frame.type === "error") {
              terminated = true;
              const message = String((frame as { message?: unknown }).message ?? "Agent error");
              patch((m) => ({ ...m, streaming: false, phase: "done", error: message }));
            }
          }

          if (!terminated) {
            patch((m) => ({ ...m, streaming: false, phase: "done", error: STREAM_ENDED_EARLY }));
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : String(err);
          patch((m) => ({ ...m, streaming: false, phase: "done", error: message }));
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
          if (!controller.signal.aborted) {
            setBusyThreadId(null);
            void queryClient.invalidateQueries({ queryKey: sessionKeys.all(lecturerId) });
          }
        }
      })();
    },
    [educatorId, patchThread, queryClient],
  );

  const send = useCallback(
    (threadId: string, text: string) => {
      const thread = threadsRef.current.find((t) => t.id === threadId);
      run(threadId, text, { announceSession: Boolean(thread && !thread.persisted) });
    },
    [run],
  );

  const branchFrom = useCallback((threadId: string, messageId: string) => {
    const source = threadsRef.current.find((t) => t.id === threadId);
    const id = newSessionId();
    if (!source) return id;

    const cut = source.messages.findIndex((m) => m.id === messageId);
    const messages = source.messages.slice(0, cut + 1).map((m) => ({ ...m, id: uid() }) as Message);

    // Flattened one level, matching the sidebar's two-tier tree: a branch of
    // a branch hangs off the same root rather than nesting further.
    const root = source.parentId ?? source.id;
    const siblings = threadsRef.current.filter((t) => t.parentId === root).length;

    const branch: Thread = {
      id,
      title: branchTitle(rootTitle(source.title), siblings),
      parentId: root,
      createdAt: Date.now(),
      messages,
      state: truncateState(source.state, messages.length),
      persisted: false,
      loaded: true,
    };

    setThreads((prev) => {
      const rootIndex = prev.findIndex((t) => t.id === root);
      const next = [...prev];
      next.splice(rootIndex + 1, 0, branch);
      return next;
    });
    return id;
  }, []);

  const editMessage = useCallback(
    (threadId: string, messageId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const thread = threadsRef.current.find((t) => t.id === threadId);
      if (!thread) return;

      const cut = thread.messages.findIndex((m) => m.id === messageId);
      if (cut < 0) return;

      // Drop the edited turn and everything after it from both the transcript
      // and the agent's memory, then resend as if it had never happened.
      const truncated = truncateState(thread.state, cut);
      patchThread(threadId, (t) => ({
        ...t,
        messages: t.messages.slice(0, cut),
        state: truncated,
      }));
      threadsRef.current = threadsRef.current.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.slice(0, cut), state: truncated } : t,
      );
      run(threadId, trimmed, { stateOverride: truncated });
    },
    [patchThread, run],
  );

  const signOut = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusyThreadId(null);
    setEducatorId(null);
    setThreads([]);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<ChatContextValue>(
    () => ({
      educatorId,
      signIn: setEducatorId,
      signOut,
      threads,
      historyLoading: sessions.isLoading,
      createThread,
      branchFrom,
      deleteThread,
      getThread,
      openThread,
      send,
      stop,
      editMessage,
      draft,
      setDraft,
      busyThreadId,
    }),
    [
      educatorId,
      signOut,
      threads,
      sessions.isLoading,
      createThread,
      branchFrom,
      deleteThread,
      getThread,
      openThread,
      send,
      stop,
      editMessage,
      draft,
      busyThreadId,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useCampus() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useCampus must be used inside CampusProvider");
  return ctx;
}
