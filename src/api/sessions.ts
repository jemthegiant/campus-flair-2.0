// TanStack Query bindings for the history sidebar.
// All fetching lives in client.ts so there's one place that knows the URL shapes.

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { deleteSession, listSessions, loadSession } from "./client";
import type { ActivityItem, Citation, SessionBlob, SessionSummary } from "./types";

export const sessionKeys = {
  all: (lecturerId: string) => ["sessions", lecturerId] as const,
  one: (lecturerId: string, sessionId: string) => ["sessions", lecturerId, sessionId] as const,
};

/** Sidebar list. Server returns it newest-first — don't re-sort. */
export function useSessions(
  lecturerId: string | null,
  options?: Partial<UseQueryOptions<SessionSummary[]>>,
) {
  return useQuery({
    queryKey: sessionKeys.all(lecturerId ?? ""),
    enabled: Boolean(lecturerId),
    queryFn: async () => (await listSessions(lecturerId!)).sessions ?? [],
    ...options,
  });
}

export function useSession(
  lecturerId: string | null,
  sessionId: string | null,
  options?: Partial<UseQueryOptions<SessionBlob>>,
) {
  return useQuery({
    queryKey: sessionKeys.one(lecturerId ?? "", sessionId ?? ""),
    enabled: Boolean(lecturerId && sessionId),
    queryFn: () => loadSession(lecturerId!, sessionId!),
    ...options,
  });
}

export function useDeleteSession(lecturerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(lecturerId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all(lecturerId) }),
  });
}

export interface HydratedMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  activity: ActivityItem[];
  citations: Citation[];
}

/**
 * Turn a stored blob back into renderable messages.
 *
 * `traces` is keyed by the assistant turn's index in `state.turns`, as a string,
 * so turn 3's trace is at `traces["3"]`. Missing keys are normal — turns served
 * by the buffered Python path produce no trace at all.
 */
export function hydrateSession(blob: SessionBlob): HydratedMessage[] {
  return (blob.state?.turns ?? []).map((turn, index) => {
    if (turn.role === "user") {
      return {
        role: "user" as const,
        content: turn.content,
        activity: [] as ActivityItem[],
        citations: [] as Citation[],
      };
    }
    const trace = blob.traces?.[String(index)];
    // `reasoning` is spread conditionally because exactOptionalPropertyTypes
    // distinguishes an absent optional property from one set to undefined.
    return {
      role: "assistant" as const,
      content: turn.content,
      ...(trace?.reasoning === undefined ? {} : { reasoning: trace.reasoning }),
      activity: trace?.activity ?? [],
      citations: turn.citations ?? [],
    };
  });
}
