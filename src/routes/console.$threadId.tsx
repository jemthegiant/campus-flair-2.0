import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/campus/BrandMark";
import { Composer } from "@/components/campus/Composer";
import { AssistantBubble, ThinkingBubble, UserBubble } from "@/components/campus/ChatMessages";
import { SAMPLE_QUESTIONS } from "@/lib/campus-agents";
import { useCampus } from "@/lib/chat-store";

export const Route = createFileRoute("/console/$threadId")({
  head: () => ({
    meta: [
      { title: "Console — Campus Flair 2.0 Educator AI" },
      {
        name: "description",
        content:
          "Chat with Campus Flair 2.0 agents for cohort analytics and teaching recommendations.",
      },
      { property: "og:title", content: "Campus Flair 2.0 Console" },
      {
        property: "og:description",
        content: "Multi-agent educator chat with analytics and recommendation agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadView,
});

function ThreadView() {
  const { threadId } = useParams({ from: "/console/$threadId" });
  const navigate = useNavigate();
  const {
    getThread,
    send,
    stop,
    busyThreadId,
    branchFrom,
    educatorId,
    editMessage,
    openThread,
    historyLoading,
  } = useCampus();
  const thread = getThread(threadId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setEditingId(null);
  }, [threadId]);

  useEffect(() => {
    if (!educatorId) {
      void navigate({ to: "/", replace: true });
      return;
    }
    // Wait for the session list before deciding a thread doesn't exist —
    // a deep link to a stored session arrives before the list does.
    if (!thread && !historyLoading) {
      void navigate({ to: "/console", replace: true });
    }
  }, [thread, navigate, educatorId, historyLoading]);

  useEffect(() => {
    openThread(threadId);
  }, [threadId, openThread]);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages.length, thread?.messages.at(-1)?.role]);

  if (!thread) return null;

  const busy = busyThreadId === thread.id;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {thread.messages.length === 0 ? (
            <EmptyState onPick={(q) => send(thread.id, q)} educatorId={educatorId} />
          ) : null}

          {thread.messages.map((m) =>
            m.role === "user" ? (
              <UserBubble
                key={m.id}
                message={m}
                editing={editingId === m.id}
                onStartEdit={() => setEditingId(m.id)}
                onCancelEdit={() => setEditingId(null)}
                onSubmitEdit={(text) => {
                  setEditingId(null);
                  editMessage(thread.id, m.id, text);
                }}
              />
            ) : m.phase === "thinking" ? (
              <ThinkingBubble
                key={m.id}
                statuses={m.response.statuses}
                step={m.statusStep}
                reasoning={m.reasoning}
              />
            ) : (
              <AssistantBubble
                key={m.id}
                message={m}
                onSuggestion={(text) => send(thread.id, text)}
                onBranch={() => {
                  const id = branchFrom(thread.id, m.id);
                  void navigate({ to: "/console/$threadId", params: { threadId: id } });
                }}
              />
            ),
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-3 pb-4 sm:px-6">
        <Composer
          className="mx-auto w-full max-w-3xl"
          disabled={busy}
          busy={busy}
          onStop={stop}
          onSend={(text) => {
            setEditingId(null);
            send(thread.id, text);
          }}
        />
      </div>
    </main>
  );
}

function EmptyState({
  onPick,
  educatorId,
}: {
  onPick: (question: string) => void;
  educatorId: string | null;
}) {
  return (
    <div className="cf-rise flex flex-col items-center pt-6 text-center">
      <BrandMark size={64} withText={false} priority />
      <h1 className="mt-4 font-display text-2xl font-bold text-gradient-brand">
        Welcome back{educatorId ? `, ${educatorId}` : ""}
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Ask about any learner, module or cohort. I route your question to the right specialist agent
        and show my working.
      </p>

      <div className="mt-6 grid w-full gap-3 text-left sm:grid-cols-2">
        {SAMPLE_QUESTIONS.map((group, gi) => (
          <div
            key={group.group}
            className="glass cf-rise rounded-xl p-3"
            style={{ animationDelay: `${gi * 70}ms` }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
              {group.group}
            </p>
            <div className="mt-2 space-y-1.5">
              {group.items.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onPick(q)}
                  className="w-full rounded-lg border border-border/70 px-2.5 py-1.5 text-left text-xs text-foreground transition-all hover:-translate-y-0.5 hover:border-neon hover:bg-neon/10"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
