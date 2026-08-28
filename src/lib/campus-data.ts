import dataset from "@/data/campus-dataset.json";

/* ------------------------------------------------------------------ *
 * Campus Flair 2.0 — derived from the real STE performance extract.
 * The raw file (146k module-enrolment rows) is precomputed into
 * src/data/campus-dataset.json; this module gives it typed shapes.
 * ------------------------------------------------------------------ */

export type RiskTier = "critical" | "elevated" | "watch" | "stable";

export type Student = {
  id: string;
  name: string;
  cohort: string;
  programme: string;
  attendance: number;
  average: number;
  engagement: number;
  submissions: number;
  risk: RiskTier;
  flag: string;
  /* real-data fields */
  cgpa: number | null;
  level: number | null;
  eFlags: number;
  warning: boolean;
  sen: boolean;
  sex: string;
  admission: string;
  entry: string;
  income: string;
  bursary: boolean;
  prePoly: number | null;
  quiz: number | null;
  prevSem: number | null;
  twoSemAgo: number | null;
  semAvg: number | null;
};

export type Benchmark = {
  min: number | null;
  p10: number | null;
  median: number | null;
  p90: number | null;
  max: number | null;
  std: number | null;
  avg: number | null;
};

export type ModuleRecord = {
  code: string;
  name: string;
  average: number;
  median: number;
  enrolled: number;
  passRate: number;
  atRisk: number;
  engagement: number;
  trend: number;
  missed: number;
  bench: Benchmark;
  gradeMix: { A: number; B: number; C: number; D: number; F: number };
};

export type TermPoint = {
  term: string;
  average: number;
  attendance: number;
  engagement: number;
  atRisk: number;
};

export type Segment = { key: string; students: number; average: number; attendance: number };

export type InterventionData = {
  total: number;
  byConcern: { key: string; count: number }[];
  byAction: { key: string; count: number }[];
  byLecturer: { key: string; count: number }[];
  byTerm: { term: string; count: number }[];
  topModules: { code: string; count: number }[];
  effectiveness: { action: string; n: number; delta: number }[];
  recent: {
    student: string;
    module: string;
    concern: string;
    action: string;
    lecturer: string;
    date: string;
    term: string;
  }[];
};

type RawStudent = Omit<Student, "name" | "cohort" | "programme" | "submissions" | "flag"> & {
  modules: number;
};

const raw = dataset as unknown as {
  meta: {
    terms: string[];
    latestTerm: string;
    students: number;
    rows: number;
    modules: number;
    faculty: string;
    course: string;
    average: number;
    attendance: number;
    engagement: number;
    atRisk: number;
    warningLetters: number;
    sen: number;
  };
  modules: (Omit<ModuleRecord, "name" | "engagement"> & { cca: number })[];
  students: RawStudent[];
  scatter: { missed: number; mark: number; warning: boolean; id: string }[];
  trajectory: TermPoint[];
  heatmap: Record<string, string | number>[];
  segments: {
    entry: Segment[];
    admission: Segment[];
    income: Segment[];
    sen: Segment[];
    level: Segment[];
  };
  interventions: InterventionData;
  funnel: { stage: string; count: number }[];
};

export const META = raw.meta;
export const TERMS = raw.meta.terms;
export const LATEST_TERM = raw.meta.latestTerm;

/** Student numbers are anonymised in the extract; keep them as the display label. */
const displayName = (id: string) => `Student ${id}`;

function flagFor(s: RawStudent): string {
  if (s.attendance < 80) return `Attendance at ${s.attendance}% — below the 80% support threshold`;
  if (s.eFlags >= 3) return `${s.eFlags} modules flagged 'E' this semester`;
  if (s.warning) return "Warning letter issued last semester";
  if (s.average >= 65) return "Consistently above the cohort benchmark";
  return `Semester average ${s.average}% against a cohort mean of ${raw.meta.average}%`;
}

export const STUDENTS: Student[] = raw.students.map((s) => ({
  ...s,
  name: displayName(s.id),
  cohort: `${raw.meta.course}-${LATEST_TERM}`,
  programme: `${raw.meta.faculty} · ${raw.meta.course}`,
  submissions: s.modules,
  flag: flagFor(s),
}));

export const MODULES: ModuleRecord[] = raw.modules.map((m) => ({
  ...m,
  name: `Module ${m.code}`,
  engagement: m.cca,
}));

export const COHORTS = TERMS as readonly string[];

export const SCATTER = raw.scatter;
export const TRAJECTORY = raw.trajectory;
export const HEATMAP = raw.heatmap;
export const INTERVENTIONS = raw.interventions;

/* ------------------------------------------------------------------ *
 * Coverage guards — several source columns are sparse or coded as
 * "unknown". Visuals must only render fields that are actually filled.
 * ------------------------------------------------------------------ */

const coverage = (fn: (s: RawStudent) => unknown) =>
  raw.students.filter((s) => {
    const v = fn(s);
    return v !== null && v !== undefined && v !== "" && v !== 0;
  }).length / (raw.students.length || 1);

export const COVERAGE = {
  cgpa: coverage((s) => s.cgpa),
  prePoly: coverage((s) => s.prePoly),
  quiz: coverage((s) => s.quiz),
  sen: coverage((s) => s.sen),
  level: coverage((s) => s.level),
};

/** "Tier 99" is the unknown/undeclared code in the income column. */
export const UNKNOWN_INCOME = "Tier 99";
export const hasIncome = (v: string) => Boolean(v) && v !== UNKNOWN_INCOME;

/** Field is reported for enough learners to be worth charting cohort-wide. */
export const isReported = (key: keyof typeof COVERAGE) => COVERAGE[key] >= 0.5;

export const SEGMENTS = {
  ...raw.segments,
  income: raw.segments.income.filter((s) => hasIncome(s.key)),
  /** Level of study has a single value in this extract — not chartable. */
  level: raw.segments.level.length > 1 ? raw.segments.level : [],
};

/**
 * Funnel stages must be monotonically decreasing to read as a funnel.
 * The raw "improved next term" count is measured against all flagged
 * learners, so it is surfaced separately as a rate instead of a stage.
 */
const rawFunnel = raw.funnel;
export const FUNNEL = rawFunnel.filter((_, i) => i < 3);
export const IMPROVED = {
  count: rawFunnel[3]?.count ?? 0,
  ofFlagged: rawFunnel[1]?.count ?? 0,
  rate: rawFunnel[1]?.count
    ? Math.round(((rawFunnel[3]?.count ?? 0) / rawFunnel[1].count) * 100)
    : 0,
};

/** Trend across the recorded terms — replaces the old invented weekly series. */
export const WEEKLY_TREND = TRAJECTORY.map((t) => ({
  week: t.term,
  average: t.average,
  attendance: t.attendance,
  engagement: t.engagement,
}));

export const RISK_DISTRIBUTION = (["stable", "watch", "elevated", "critical"] as RiskTier[]).map(
  (tier) => ({
    tier: tier[0]!.toUpperCase() + tier.slice(1),
    count: STUDENTS.filter((s) => s.risk === tier).length,
  }),
);

export const riskTierLabel: Record<RiskTier, string> = {
  critical: "Critical",
  elevated: "Elevated",
  watch: "Watch",
  stable: "Stable",
};

export const cohortStats = () => ({
  students: META.students,
  average: Math.round(META.average),
  attendance: Math.round(META.attendance),
  engagement: Math.round(META.engagement),
  atRisk: META.atRisk,
  warnings: META.warningLetters,
  modules: META.modules,
  rows: META.rows,
});

export const findModuleByCode = (code: string) =>
  MODULES.find((m) => m.code.toLowerCase() === code.toLowerCase());

export const studentById = (id: string) => STUDENTS.find((s) => s.id === id);

/** Benchmark comparison rows: this cohort vs the previous cohort distribution. */
export const moduleBenchmarkSeries = (mods: ModuleRecord[] = MODULES) =>
  mods.map((m) => ({
    code: m.code,
    current: m.average,
    prevAvg: m.bench.avg ?? 0,
    p10: m.bench.p10 ?? 0,
    p90: m.bench.p90 ?? 0,
    spread: (m.bench.p90 ?? 0) - (m.bench.p10 ?? 0),
    delta: Math.round((m.average - (m.bench.avg ?? m.average)) * 10) / 10,
  }));
