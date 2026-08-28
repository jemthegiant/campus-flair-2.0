// The three agents that actually exist in the backend. The conversational
// agent fronts the chat and delegates to the other two.
//
// `retrieval` and `orchestrator` used to live here. They were inventions of the
// mock, and `classify()` — a keyword matcher over the user's own question — was
// picking between them client-side. Now that `route_taken` arrives populated,
// the pill reflects what the backend actually did.

export type AgentKey = "conversational" | "analytics" | "recommendation";

export type AgentMeta = {
  key: AgentKey;
  label: string;
  blurb: string;
};

export const AGENTS: Record<AgentKey, AgentMeta> = {
  conversational: {
    key: "conversational",
    label: "Conversational Agent",
    blurb: "Answers directly and delegates to the analytics and recommendation agents.",
  },
  analytics: {
    key: "analytics",
    label: "Analytics Agent",
    blurb: "Reads pipeline output: cohort profiles, urgency bands and red-flag counts.",
  },
  recommendation: {
    key: "recommendation",
    label: "Recommendations Agent",
    blurb: "Generates ranked interventions for a specific learner and module.",
  },
};

export type TraceStep = { label: string; detail: string; ms: number };
export type Source = { title: string; kind: string; ref: string; excerpt: string };

/**
 * Panels are disabled while the dashboards have no backend data source. The
 * variant is kept so re-enabling one is a change here, not a refactor.
 */
export type ResponseView = { kind: "none" };

export type AgentResponse = {
  agent: AgentKey;
  statuses: string[];
  body: string[];
  view: ResponseView;
  sources: Source[];
  suggestions: string[];
  trace: TraceStep[];
};

// Hardcoded rather than derived from `campus-dataset.json` — that bundle is no
// longer imported anywhere, so it drops out of the build entirely.
export const SAMPLE_QUESTIONS: { group: string; items: string[] }[] = [
  {
    group: "Teaching scope",
    items: ["List my modules", "How many students are enrolled in each of my modules?"],
  },
  {
    group: "Analytics",
    items: [
      "What is the urgency band breakdown across all my modules?",
      "Can you show me the cohort profile for STE002?",
    ],
  },
  {
    group: "At-risk learners",
    items: [
      "Which students are in the critical band in STE001?",
      "How many students carry the low attendance flag?",
    ],
  },
  {
    group: "Recommendations",
    items: [
      "Generate an intervention recommendation for a critical student in STE001",
      "What are the red flag trigger rules?",
    ],
  },
];
