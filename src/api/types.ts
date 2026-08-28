// Wire types for the STETSS chat backend.
//
// Read out of the DEPLOYED reference bundle (cf2-dev-ui/assets/index-C6CVBino.js),
// not guessed. If something here looks odd, it's because the backend is that way.

export type Role = "user" | "assistant";

export interface Citation {
  /** e.g. s3://cf2-dev-pipeline/analysis/CS101/cohort.json */
  s3_uri: string;
  label?: string;
}

export interface Turn {
  role: Role;
  content: string;
  citations?: Citation[];
  [key: string]: unknown;
}

/**
 * The agent's memory. The server stores nothing between turns — you send this
 * back every time.
 *
 * `semester_id` is NOT sent by the client. It comes back inside the response
 * state and is display-only.
 */
export interface ConversationState {
  turns: Turn[];
  active_student: string | null;
  active_module: string | null;
  active_cohort: string | null;
  semester_id?: string | null;
  [key: string]: unknown;
}

export function emptyState(): ConversationState {
  return { turns: [], active_student: null, active_module: null, active_cohort: null };
}

/** The `final` frame's payload. */
export interface ChatResponse {
  session_id: string;
  answer: string;
  citations: Citation[];
  route_taken: string;
  state: ConversationState;
  agent_version: string;
  /** Date of the pipeline snapshot the answer was computed from. */
  data_as_of?: string;
  [key: string]: unknown;
}

/**
 * Body for POST /api/chat.
 *
 * `stream: true` is added by the client wrapper. There is no `semester_id`.
 */
export interface ChatRequest {
  /** Trusted from the request — there is no real auth yet. */
  lecturer_id: string;
  message: string;
  /** `ui-<uuid>`, stable for the whole conversation. */
  session_id: string;
  state: ConversationState;
  /** Branches only: `branch:<root>` or `branch N:<root>`. */
  title?: string;
  /** Branches only. */
  parent_session_id?: string;
}

// --- SSE frames --------------------------------------------------------------

export interface ReasoningFrame {
  type: "reasoning";
  text: string;
}
export interface TokenFrame {
  type: "token";
  text: string;
}
export interface StepFrame {
  type: "step";
  phase: "start" | "update" | "end";
  name: string;
  label?: string;
  detail?: string;
  status?: string;
}
export interface FinalFrame {
  type: "final";
  response: ChatResponse;
}
export interface ErrorFrame {
  type: "error";
  message: string;
}

export type ChatFrame =
  | ReasoningFrame
  | TokenFrame
  | StepFrame
  | FinalFrame
  | ErrorFrame
  | { type: string; [key: string]: unknown };

// --- Activity feed -----------------------------------------------------------

export interface ActivityStep {
  name: string;
  label: string;
  status: string | null;
  done: boolean;
  detail?: string;
  /** Client-measured wall-clock for the step. Not sent by the backend. */
  ms?: number;
}

/** Text streamed between tool calls — the agent narrating, not the answer. */
export interface ActivityNarration {
  kind: "narration";
  text: string;
}

export type ActivityItem = ActivityStep | ActivityNarration;

export function isStep(item: ActivityItem): item is ActivityStep {
  return !("kind" in item);
}

export interface AgentTrace {
  reasoning?: string;
  activity?: ActivityItem[];
}

// --- Session history ---------------------------------------------------------

export interface SessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
  parent_session_id: string | null;
}

export interface SessionBlob {
  session_id: string;
  lecturer_id: string;
  semester_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  state: ConversationState;
  parent_session_id: string | null;
  /** Keyed by the assistant turn's index in state.turns, as a string. */
  traces?: Record<string, AgentTrace>;
}
