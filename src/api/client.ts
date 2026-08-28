// STETSS backend client. Ported from the deployed reference bundle.
//
// Two things here are not obvious and are both load-bearing:
//
// 1. `x-amz-content-sha256` on POST /api/chat. The chat Lambda sits behind
//    CloudFront Origin Access Control, which signs the request and needs the
//    viewer to supply the payload hash. Without it OAC returns 403 — and the
//    distribution rewrites 403 to index.html with a 200, so your fetch sees a
//    "successful" response full of HTML. Checking `res.ok` will lie to you.
//
// 2. Content-type checks. Because of that same rewrite, the ONLY reliable way to
//    tell a real response from a swallowed error is the content type.
//
// `crypto.subtle` requires a secure context: https or localhost.

import type {
  ActivityItem,
  ActivityStep,
  ChatFrame,
  ChatRequest,
  SessionBlob,
  SessionSummary,
  StepFrame,
} from "./types";
import { isStep } from "./types";

/** Relative on purpose: the SPA and the API share an origin via CloudFront. */
const API_BASE = "/api";

async function payloadHashHeader(body: string): Promise<Record<string, string>> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return {
    "x-amz-content-sha256": Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };
}

/** Extract the JSON from one SSE block. "" for comment keep-alives. */
export function dataPayload(block: string): string {
  return block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
}

/**
 * Yield frames from the byte stream.
 *
 * The Lambda's keep-alive is a comment line padded with 100,000 spaces (Lambda
 * response streaming holds writes until ~100KB accumulates, so a small one never
 * escapes the function). `dataPayload` drops it for free. Frames also routinely
 * split across chunk boundaries, hence the buffer.
 */
async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const payload = dataPayload(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (payload) yield JSON.parse(payload) as ChatFrame;
    }
  }
  const tail = dataPayload(buffer);
  if (tail) yield JSON.parse(tail) as ChatFrame;
}

/** Run one chat turn, yielding frames as they arrive. */
export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatFrame> {
  const body = JSON.stringify({ ...request, stream: true });

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(await payloadHashHeader(body)),
    },
    body,
    // `signal ?? null` rather than `signal`: exactOptionalPropertyTypes rejects
    // an explicit `undefined` for an optional property.
    signal: signal ?? null,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let detail = res.statusText;
    try {
      detail = (text && JSON.parse(text).error) || detail;
    } catch {
      /* not JSON */
    }
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }

  if (!res.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error(
      "Unexpected non-streaming response from /chat " +
        "(usually a missing or mismatched x-amz-content-sha256 header)",
    );
  }

  yield* parseSse(res.body);
}

// --- Session history routes --------------------------------------------------

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();

  if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`Unexpected non-JSON response from ${path} (is the endpoint deployed?)`);
  }

  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${parsed?.error || res.statusText}`);
  }
  return parsed as T;
}

const lecturerQuery = (id: string) => `lecturer_id=${encodeURIComponent(id)}`;

export function listSessions(lecturerId: string) {
  return requestJson<{ sessions: SessionSummary[] }>(`/sessions?${lecturerQuery(lecturerId)}`);
}

export function loadSession(lecturerId: string, sessionId: string) {
  return requestJson<SessionBlob>(
    `/sessions/${encodeURIComponent(sessionId)}?${lecturerQuery(lecturerId)}`,
  );
}

export function deleteSession(lecturerId: string, sessionId: string) {
  return requestJson<{ ok: boolean; session_id: string }>(
    `/sessions/${encodeURIComponent(sessionId)}?${lecturerQuery(lecturerId)}`,
    { method: "DELETE" },
  );
}

/**
 * True when an error means "that session isn't there" rather than "the backend
 * is broken". All three branches are needed: the store returns a real 404 with
 * `session not found`, but the distribution rewrites 404 to index.html with a
 * 200, which surfaces as the non-JSON error instead. Same condition, three
 * disguises. Drop the session from the sidebar; don't alarm the user.
 */
export function isMissingSession(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Unexpected non-JSON response") ||
    message.includes("Request failed (404)") ||
    message.includes("session not found")
  );
}

// --- Activity reduction ------------------------------------------------------

/** Fold one step frame into the activity list. */
export function applyStep(activity: ActivityItem[], frame: StepFrame): ActivityItem[] {
  if (frame.phase === "start") {
    return [
      ...activity,
      { name: frame.name, label: frame.label ?? frame.name, status: null, done: false },
    ];
  }
  const next = [...activity];
  for (let i = next.length - 1; i >= 0; i--) {
    const item = next[i];
    if (item === undefined || !isStep(item)) continue;
    if (item.name !== frame.name || item.done) continue;

    // Spread `detail` conditionally: under exactOptionalPropertyTypes an
    // explicit `undefined` is not the same as an absent optional property.
    const detail = frame.detail ?? item.detail;
    next[i] =
      frame.phase === "update"
        ? { ...item, ...(detail === undefined ? {} : { detail }) }
        : {
            ...item,
            done: true,
            status: frame.status ?? "success",
            ...(detail === undefined ? {} : { detail }),
          };
    break;
  }
  return next;
}

/** Close any step still open, e.g. when `final` arrives. */
export function closeOpenSteps(activity: ActivityItem[]): ActivityItem[] {
  return activity.map((item) =>
    isStep(item) && !item.done ? { ...item, done: true, status: item.status ?? "success" } : item,
  );
}

/** Collapse consecutive same-named steps into one row with a count. */
export function groupSteps(steps: ActivityStep[]) {
  const groups: {
    name: string;
    label: string;
    count: number;
    children: ActivityStep[];
    done: boolean;
    status: string | null;
  }[] = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.name === step.name) {
      last.children.push(step);
      last.count += 1;
      last.done = last.done && step.done;
      if (step.status === "error") last.status = "error";
    } else {
      groups.push({
        name: step.name,
        label: step.label,
        count: 1,
        children: [step],
        done: step.done,
        status: step.status ?? null,
      });
    }
  }
  return groups;
}

// --- Session ids and branch titles -------------------------------------------

export function newSessionId(): string {
  // `crypto.randomUUID` only exists in a secure context (https or localhost).
  // Falling back keeps the UI usable when the dev server is reached over a LAN
  // IP — note that `/api/chat` itself still won't work there, because the OAC
  // payload hash needs `crypto.subtle`, which has the same restriction.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ui-${crypto.randomUUID()}`;
  }
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `ui-${rand()}-${rand()}-${rand()}-${rand()}`;
}

const BRANCH_PREFIX = /^branch(?: \d+)?:\s*/;
const TITLE_MAX = 60;

/** Strip stacked `branch:` prefixes back to the root title. */
export function rootTitle(title: string | null | undefined): string {
  let text = (title ?? "").trim();
  while (BRANCH_PREFIX.test(text)) text = text.replace(BRANCH_PREFIX, "");
  return text.trim();
}

/** `branch:<root>` for the first branch, `branch N:<root>` after that. */
export function branchTitle(title: string, siblingCount = 0): string {
  const root = rootTitle(title).split(/\s+/).filter(Boolean).join(" ");
  const out = siblingCount === 0 ? `branch:${root}` : `branch ${siblingCount + 1}:${root}`;
  return out.length > TITLE_MAX ? `${out.slice(0, TITLE_MAX)}…` : out;
}

/** Title a session from its first user turn, matching the server's derivation. */
export function deriveTitle(firstUserMessage: string): string {
  const text = String(firstUserMessage ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text;
}