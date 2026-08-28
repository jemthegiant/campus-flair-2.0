// Maps the STETSS backend's wire shapes onto the local `AgentResponse` the UI
// renders. Everything the mock used to invent -- statuses, trace, sources, view
// -- is derived here from real frames instead.
//
// Three of the rules below were read out of the deployed reference bundle
// (cf2-dev-ui/assets/index-C6CVBino.js) rather than guessed, and are marked
// [ref]. They are conventions of this backend, not of SSE in general.

import { applyStep, groupSteps } from "@/api/client";
import { isStep, type ActivityItem, type ChatResponse, type Citation } from "@/api/types";
import type { ConversationState, StepFrame } from "@/api/types";
import type { AgentKey, AgentResponse, Source, TraceStep } from "./campus-agents";

/** Shown before the agent has emitted its first step. */
export const INITIAL_STATUS = "Contacting the agent…";

// --- Step timing -------------------------------------------------------------

/**
 * Wall-clock per step, so the trace popover can show real latencies.
 *
 * The backend sends no timings, so we measure between `start` and `end` for a
 * given step name. Concurrent steps sharing a name would smear into each other;
 * in practice the agent runs them in sequence.
 */
export type StepClock = Map<string, number>;

export function applyStepToTrace(
  activity: ActivityItem[],
  frame: StepFrame,
  clock: StepClock,
): ActivityItem[] {
  const next = applyStep(activity, frame);

  if (frame.phase === "start") {
    clock.set(frame.name, Date.now());
    return next;
  }
  if (frame.phase !== "end") return next;

  const startedAt = clock.get(frame.name);
  clock.delete(frame.name);
  if (startedAt === undefined) return next;

  const ms = Date.now() - startedAt;
  for (let i = next.length - 1; i >= 0; i--) {
    const item = next[i];
    if (item === undefined || !isStep(item)) continue;
    if (item.name !== frame.name || !item.done || item.ms !== undefined) continue;
    next[i] = { ...item, ms };
    break;
  }
  return next;
}

/** Step labels, in order, for the thinking indicator. */
export function statusesFrom(activity: ActivityItem[]): string[] {
  const labels = activity.filter(isStep).map((s) => s.label);
  return labels.length > 0 ? labels : [INITIAL_STATUS];
}

/** Answer text the agent emitted before a step boundary discarded it. [ref] */
export function narrationsFrom(activity: ActivityItem[]): string[] {
  return activity.flatMap((item) => (isStep(item) ? [] : [item.text]));
}

export function traceFromActivity(activity: ActivityItem[]): TraceStep[] {
  return groupSteps(activity.filter(isStep)).map((group) => {
    const details = group.children
      .map((child) => child.detail)
      .filter((d): d is string => Boolean(d));
    return {
      label: group.count > 1 ? `${group.label} ×${group.count}` : group.label,
      detail:
        details.length > 0
          ? details.join(" · ")
          : group.status === "error"
            ? "Step failed."
            : group.done
              ? "Completed."
              : "Running…",
      ms: group.children.reduce((total, child) => total + (child.ms ?? 0), 0),
    };
  });
}

// --- Follow-up questions -----------------------------------------------------

// [ref] Follow-ups are not a response field. The agent appends a trailing
// "You might also ask" heading plus a bullet list to the answer markdown, and
// the client strips it back off. If the tail doesn't match exactly, the whole
// answer is left intact rather than half-eaten.
const FOLLOWUP_HEADING = /^\s*\*{0,2}\s*you might also ask\s*:?\s*\*{0,2}\s*:?\s*$/i;
const FOLLOWUP_ITEM = /^\s*(?:[-*]|\d+[.)])\s+(.*\S)\s*$/;

function cleanFollowUp(text: string): string {
  return text
    .trim()
    .replace(/^\*{1,3}(.*?)\*{1,3}$/, "$1")
    .trim()
    .replace(/^(?:ask|q)\s*:\s*/i, "")
    .trim();
}

export function splitFollowUps(answer: string): { body: string; followUps: string[] } {
  const text = String(answer ?? "");
  const lines = text.split("\n");

  let heading = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line !== undefined && FOLLOWUP_HEADING.test(line)) {
      heading = i;
      break;
    }
  }
  if (heading === -1) return { body: text.trimEnd(), followUps: [] };

  const followUps: string[] = [];
  for (let i = heading + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") continue;
    const match = FOLLOWUP_ITEM.exec(line);
    if (!match?.[1]) return { body: text.trimEnd(), followUps: [] };
    const item = cleanFollowUp(match[1]);
    if (item) followUps.push(item);
  }

  return followUps.length === 0
    ? { body: text.trimEnd(), followUps: [] }
    : { body: lines.slice(0, heading).join("\n").trimEnd(), followUps };
}

// --- Citations ---------------------------------------------------------------

// [ref] Citations arrive as bare S3 URIs. The human title is reconstructed from
// the key layout of the analysis pipeline's bucket.
export function citationLabel(s3Uri: string): string {
  const key = s3Uri.replace(/^s3:\/\/[^/]+\//, "");
  let m: RegExpExecArray | null;

  if (key.includes("/intervention_priorities/")) return "Intervention priorities";
  if ((m = /\/students\/([^/]+)\/recommendations\/([^/]+)\.json$/.exec(key)))
    return `Recommendation (${m[1]} / ${m[2]})`;
  if ((m = /\/students\/([^/]+)\/historical_context\.json$/.exec(key)))
    return `Historical context (${m[1]})`;
  if ((m = /\/students\/([^/]+)\/aggregate\.json$/.exec(key))) return `Student summary (${m[1]})`;
  if ((m = /\/students\/([^/]+)\/aggregate\.md$/.exec(key)))
    return `Student summary methodology (${m[1]})`;
  if ((m = /\/analysis\/([^/]+)\/cohort\.json$/.exec(key))) return `Cohort profile (${m[1]})`;
  if ((m = /\/analysis\/([^/]+)\/cohort\.md$/.exec(key))) return `Cohort methodology (${m[1]})`;
  if ((m = /\/analysis\/([^/]+)\/([^/]+)\.json$/.exec(key)))
    return `Student module profile (${m[2]} / ${m[1]})`;
  if ((m = /\/analysis\/([^/]+)\/([^/]+)\.md$/.exec(key)))
    return `Module methodology (${m[2]} / ${m[1]})`;
  if (key.includes("/validation/")) return "Data validation report";
  if ((m = /(?:^|\/)run=([^/]+)\/result\.json$/.exec(key)))
    return `Ad-hoc analysis result (${m[1]})`;
  if ((m = /^adhoc\/recommendation\/[^/]+\/([^_/]+)_([^/]+)\.json$/.exec(key)))
    return `Intervention plan (${m[1]} / ${m[2]})`;
  if (key.startsWith("extracted-data/") || key.includes("CF_Student_Performance"))
    return "Raw student dataset";
  return "Source data";
}

function citationKind(s3Uri: string): string {
  const key = s3Uri.replace(/^s3:\/\/[^/]+\//, "");
  if (key.includes("/students/")) return "Student";
  if (key.includes("/analysis/")) return "Analysis";
  if (key.includes("/validation/")) return "Validation";
  if (key.includes("intervention")) return "Advising";
  if (key.startsWith("extracted-data/")) return "Dataset";
  return key.endsWith(".md") ? "Methodology" : "Pipeline";
}

export function sourcesFromCitations(citations: Citation[]): Source[] {
  return citations.map((citation) => ({
    title: citation.label ?? citationLabel(citation.s3_uri),
    kind: citationKind(citation.s3_uri),
    ref: citation.s3_uri.replace(/^s3:\/\/[^/]+\//, ""),
    excerpt: "",
  }));
}

// --- Routing and views -------------------------------------------------------

// Observed `route_taken` values, confirmed against real backend payloads:
//   "pipeline"       → answers read from the analysis pipeline's output
//   "recommendation" → generated intervention plans
// Anything else is the conversational agent answering directly. Unknown values
// deliberately fall through to conversational rather than being guessed at.
const ROUTE_TO_AGENT: Record<string, AgentKey> = {
  pipeline: "analytics",
  analysis: "analytics",
  analytics: "analytics",
  cohort: "analytics",
  module: "analytics",
  recommendation: "recommendation",
  recommendations: "recommendation",
  intervention: "recommendation",
  advising: "recommendation",
  conversational: "conversational",
  conversation: "conversational",
  none: "conversational",
};

export function agentFromRoute(route: string | undefined): AgentKey {
  const key = (route ?? "").toLowerCase().trim();
  if (!key) return "conversational";
  const exact = ROUTE_TO_AGENT[key];
  if (exact) return exact;
  for (const [needle, agent] of Object.entries(ROUTE_TO_AGENT)) {
    if (key.includes(needle)) return agent;
  }
  return "conversational";
}

// --- Assembly ----------------------------------------------------------------

export function paragraphsOf(answer: string): string[] {
  return answer.split(/\n{2,}/).filter((p) => p.trim().length > 0);
}

export function emptyResponse(_question: string): AgentResponse {
  return {
    agent: "conversational",
    statuses: [INITIAL_STATUS],
    body: [],
    view: { kind: "none" },
    sources: [],
    suggestions: [],
    trace: [],
  };
}

/** Rebuild the response from whatever has streamed in so far. */
export function buildResponseFrom(options: {
  question: string;
  answer: string;
  activity: ActivityItem[];
  final?: ChatResponse | undefined;
  state?: ConversationState | undefined;
}): AgentResponse {
  const { answer, activity, final } = options;
  const { body, followUps } = splitFollowUps(answer);

  return {
    agent: agentFromRoute(final?.route_taken),
    statuses: statusesFrom(activity),
    body: paragraphsOf(body),
    view: { kind: "none" },
    sources: sourcesFromCitations(final?.citations ?? []),
    suggestions: followUps,
    trace: traceFromActivity(activity),
  };
}
