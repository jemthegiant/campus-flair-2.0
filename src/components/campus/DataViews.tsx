import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  Gauge,
  GraduationCap,
  Users,
} from "lucide-react";
import {
  FUNNEL,
  IMPROVED,
  INTERVENTIONS as INTERVENTION_DATA,
  LATEST_TERM,
  META,
  MODULES,
  SCATTER,
  SEGMENTS,
  STUDENTS,
  TRAJECTORY,
  cohortStats,
  hasIncome,
  moduleBenchmarkSeries,
  riskTierLabel,
  type Student,
  type RiskTier,
} from "@/lib/campus-data";
import { AGENTS, type AgentKey } from "@/lib/campus-agents";
import { cn } from "@/lib/utils";

const chartTooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid color-mix(in oklab, var(--neon) 35%, transparent)",
    borderRadius: "12px",
    color: "var(--popover-foreground)",
    fontSize: "12px",
  },
  cursor: { fill: "color-mix(in oklab, var(--neon) 10%, transparent)" },
};

function Panel({
  title,
  children,
  className,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("glass cf-rise rounded-xl p-3", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
  delay: number;
}) {
  return (
    <div className="glass cf-rise rounded-xl p-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 text-neon">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const riskColor: Record<RiskTier, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  elevated: "bg-warn/15 text-warn border-warn/40",
  watch: "bg-magenta/15 text-magenta border-magenta/40",
  stable: "bg-success/15 text-success border-success/40",
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        riskColor[tier],
      )}
    >
      {riskTierLabel[tier]}
    </span>
  );
}

const axis = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: false,
  tickLine: false,
} as const;

export function AnalyticsView() {
  const stats = cohortStats();
  const bench = moduleBenchmarkSeries();
  const clean = SCATTER.filter((p) => !p.warning);
  const warned = SCATTER.filter((p) => p.warning);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi
          icon={Users}
          label="Learners"
          value={stats.students.toLocaleString()}
          hint={`${stats.modules} modules · ${LATEST_TERM}`}
          delay={0}
        />
        <Kpi
          icon={Gauge}
          label="Avg mark"
          value={`${META.average}%`}
          hint={`${stats.rows.toLocaleString()} enrolment records`}
          delay={60}
        />
        <Kpi
          icon={Clock3}
          label="Attendance"
          value={`${META.attendance}%`}
          hint={`${(100 - META.attendance).toFixed(1)}% of lessons missed`}
          delay={120}
        />
        <Kpi
          icon={AlertTriangle}
          label="Needs support"
          value={stats.atRisk.toLocaleString()}
          hint={`${stats.warnings.toLocaleString()} warning letters on file`}
          delay={180}
        />
      </div>

      <Panel title="Cohort trajectory across recorded semesters" delay={140}>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={TRAJECTORY} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid
              stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
              vertical={false}
            />
            <XAxis dataKey="term" {...axis} />
            <YAxis domain={["dataMin - 4", "dataMax + 4"]} {...axis} />
            <Tooltip {...chartTooltip} />
            <Line
              type="monotone"
              name="Avg mark"
              dataKey="average"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              name="Attendance"
              dataKey="attendance"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              name="CCA percentile"
              dataKey="engagement"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Module marks vs previous-cohort benchmark" delay={200}>
        <ResponsiveContainer width="100%" height={210}>
          <ComposedChart data={bench} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid
              stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
              vertical={false}
            />
            <XAxis dataKey="code" {...axis} interval={0} angle={-30} height={44} dy={10} />
            <YAxis domain={[20, 90]} {...axis} />
            <Tooltip {...chartTooltip} />
            <Bar name="This cohort" dataKey="current" radius={[6, 6, 0, 0]} barSize={22}>
              {bench.map((b) => (
                <Cell key={b.code} fill={b.delta < 0 ? "var(--chart-2)" : "var(--chart-1)"} />
              ))}
            </Bar>
            <Line
              name="Previous cohort avg"
              type="monotone"
              dataKey="prevAvg"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              name="Prev p10"
              type="monotone"
              dataKey="p10"
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
            />
            <Line
              name="Prev p90"
              type="monotone"
              dataKey="p90"
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Bars below the dashed band sit under the previous cohort's 10th-90th percentile range.
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Lessons missed vs attainment" delay={260}>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 6, right: 10, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="color-mix(in oklab, var(--neon) 14%, transparent)" />
              <XAxis
                type="number"
                dataKey="missed"
                name="% lessons missed"
                unit="%"
                domain={[0, 30]}
                {...axis}
              />
              <YAxis type="number" dataKey="mark" name="Avg mark" domain={[10, 100]} {...axis} />
              <ZAxis range={[26, 26]} />
              <Tooltip {...chartTooltip} cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine y={50} stroke="var(--warn)" strokeDasharray="4 4" />
              <Scatter name="No warning letter" data={clean} fill="var(--chart-1)" opacity={0.55} />
              <Scatter name="Warning letter" data={warned} fill="var(--chart-2)" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            400-learner sample · amber line marks the 50% pass threshold.
          </p>
        </Panel>

        <Panel title="Attainment by intake pathway" delay={300}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={SEGMENTS.entry}
              layout="vertical"
              margin={{ top: 6, right: 12, bottom: 0, left: 6 }}
            >
              <CartesianGrid
                stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
                horizontal={false}
              />
              <XAxis type="number" domain={[40, 60]} {...axis} />
              <YAxis type="category" dataKey="key" width={58} {...axis} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="average" name="Avg mark" radius={[0, 6, 6, 0]} barSize={14}>
                {SEGMENTS.entry.map((s) => (
                  <Cell
                    key={s.key}
                    fill={s.average < META.average ? "var(--chart-2)" : "var(--chart-1)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Entry qualification codes, sized by learner count.
          </p>
        </Panel>
      </div>

      <Panel title="Learners requiring attention" delay={340}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2">Student no.</th>
                <th className="pb-2">Avg</th>
                <th className="pb-2">Attend</th>
                <th className="pb-2">'E' flags</th>
                <th className="pb-2">Warning</th>
                <th className="pb-2">Tier</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.filter((s) => s.risk !== "stable")
                .slice(0, 8)
                .map((s) => (
                  <tr key={s.id} className="border-t border-border/60">
                    <td className="py-1.5 font-mono font-medium text-foreground">{s.id}</td>
                    <td className="py-1.5 text-foreground">{s.average}%</td>
                    <td className="py-1.5 text-foreground">{s.attendance}%</td>
                    <td className="py-1.5 text-foreground">{s.eFlags}</td>
                    <td className="py-1.5 text-muted-foreground">{s.warning ? "Yes" : "—"}</td>
                    <td className="py-1.5">
                      <RiskBadge tier={s.risk} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Student profile (Retrieval Agent) ---------------- */

export function StudentView({ student }: { student: Student }) {
  /* Only chart axes the record actually carries — the extract leaves
     pre-poly score and CGPA blank for a large share of learners. */
  const radar = [
    { subject: "Attainment", learner: student.average, cohort: META.average },
    { subject: "Attendance", learner: student.attendance, cohort: META.attendance },
    { subject: "CCA", learner: student.engagement, cohort: META.engagement },
    student.quiz ? { subject: "Quiz effort", learner: student.quiz, cohort: 50 } : null,
    student.prevSem
      ? { subject: "Last sem", learner: student.prevSem, cohort: META.average }
      : null,
    student.cgpa ? { subject: "CGPA", learner: student.cgpa * 25, cohort: 50 } : null,
  ].filter((d): d is { subject: string; learner: number; cohort: number } => d !== null);
  const trend = [
    { point: "2 sems ago", score: student.twoSemAgo ?? null },
    { point: "Last sem", score: student.prevSem ?? null },
    { point: LATEST_TERM, score: student.average },
  ];

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi
          icon={GraduationCap}
          label="Avg mark"
          value={`${student.average}%`}
          hint={`${student.submissions} modules`}
          delay={0}
        />
        <Kpi
          icon={Clock3}
          label="Attendance"
          value={`${student.attendance}%`}
          hint={`${(100 - student.attendance).toFixed(1)}% missed`}
          delay={60}
        />
        {student.cgpa ? (
          <Kpi
            icon={Gauge}
            label="CGPA"
            value={`${student.cgpa}`}
            hint={`Level ${student.level ?? "—"}`}
            delay={120}
          />
        ) : (
          <Kpi
            icon={Gauge}
            label="CCA percentile"
            value={`${student.engagement}`}
            hint="No CGPA on record"
            delay={120}
          />
        )}
        <Kpi
          icon={AlertTriangle}
          label="'E' flags"
          value={`${student.eFlags}`}
          hint={student.warning ? "Warning letter issued" : "No warning letter"}
          delay={180}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Learner profile vs cohort" delay={160}>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radar} outerRadius={72}>
              <PolarGrid stroke="color-mix(in oklab, var(--neon) 22%, transparent)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip {...chartTooltip} />
              <Radar
                name="Learner"
                dataKey="learner"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.3}
              />
              <Radar
                name="Cohort"
                dataKey="cohort"
                stroke="var(--chart-3)"
                fill="var(--chart-3)"
                fillOpacity={0.14}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Semester trajectory" delay={220}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
              <CartesianGrid
                stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
                vertical={false}
              />
              <XAxis dataKey="point" {...axis} />
              <YAxis domain={[0, 100]} {...axis} />
              <Tooltip {...chartTooltip} />
              <ReferenceLine y={50} stroke="var(--warn)" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Record detail" delay={280}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          {(
            [
              ["Student number", student.id],
              ["Course", student.programme],
              student.level ? ["Level of study", `${student.level}`] : null,
              ["Admission type", student.admission === "M" ? "Mainstream" : "Direct"],
              student.entry ? ["Entry qualification", student.entry] : null,
              student.prePoly !== null ? ["Pre-poly score", `${student.prePoly}`] : null,
              student.sen ? ["SEN indicator", "Yes"] : null,
              ["Bursary this sem", student.bursary ? "Yes" : "No"],
              hasIncome(student.income) ? ["Per-capita income", student.income] : null,
              ["Risk tier", riskTierLabel[student.risk]],
            ].filter(Boolean) as [string, string][]
          ).map(([k, v]) => (
            <div key={k as string} className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {k}
              </span>
              <span className="text-foreground">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{student.flag}</p>
      </Panel>
    </div>
  );
}

/* ---------------- Recommendations ---------------- */

const worstModules = [...MODULES].sort((a, b) => a.average - b.average).slice(0, 2);
const targets = STUDENTS.filter((s) => s.risk === "critical" || s.risk === "elevated");
const lowAttendance = STUDENTS.filter((s) => s.attendance < 82);

const INTERVENTION_CARDS = [
  {
    title: `Supplementary clinic — ${worstModules[0]?.code ?? "weakest module"}`,
    impact: 9,
    effort: 3,
    window: "Next 4 weeks",
    targets: targets.slice(0, 4).map((s) => s.id),
    detail: `${worstModules[0]?.atRisk ?? 0} learners are below the 50% pass mark in ${
      worstModules[0]?.code ?? "this module"
    }. Remedial lessons are the most-logged action in the intervention record.`,
  },
  {
    title: "Attendance re-engagement outreach",
    impact: 7,
    effort: 1,
    window: "This week",
    targets: lowAttendance.slice(0, 4).map((s) => s.id),
    detail: `${lowAttendance.length.toLocaleString()} learners are under 82% attendance; the scatter shows a clear attainment penalty past ~15% of lessons missed.`,
  },
  {
    title: `Counselling referrals — repeat 'E' flags`,
    impact: 6,
    effort: 2,
    window: "Weeks 1-6",
    targets: STUDENTS.filter((s) => s.eFlags >= 4)
      .slice(0, 4)
      .map((s) => s.id),
    detail:
      "Learners carrying four or more 'E' module flags this semester, matched to the counselling pathway already used by lecturers.",
  },
  {
    title: `Formative checkpoints — ${worstModules[1]?.code ?? "second weakest module"}`,
    impact: 5,
    effort: 4,
    window: "Next semester",
    targets: [`Cohort ${LATEST_TERM}`],
    detail: `Average ${worstModules[1]?.average ?? 0}% against a previous-cohort mean of ${
      worstModules[1]?.bench.avg ?? 0
    }%. Split the mid-semester assessment into low-stakes checkpoints.`,
  },
];

const shortAction = (a: string) =>
  a
    .replace("Arranged for supplementary / remedial lessons for student", "Remedial lessons")
    .replace("Conducted consultations with student", "Consultation")
    .replace("Counselled student", "Counselling")
    .replace("Remedial lessons; Counselling", "Remedial + counselling");

export function RecommendationsView() {
  const effect = INTERVENTION_DATA.effectiveness.map((e) => ({
    action: shortAction(e.action),
    delta: e.delta,
    n: e.n,
  }));

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {INTERVENTION_CARDS.map((item, i) => (
          <div
            key={item.title}
            className="glass cf-rise rounded-xl p-3"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-sm font-semibold text-foreground">{item.title}</p>
              <span className="shrink-0 rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 font-mono text-[10px] text-neon">
                #{i + 1}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            <div className="mt-2 space-y-1.5">
              <Meter label="Projected impact" value={item.impact} tone="neon" />
              <Meter label="Delivery effort" value={item.effort} tone="magenta" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock3 className="h-3 w-3" /> {item.window}
              </span>
              {item.targets.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Observed effect of logged interventions" delay={260}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={effect}
              layout="vertical"
              margin={{ top: 6, right: 14, bottom: 0, left: 10 }}
            >
              <CartesianGrid
                stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
                horizontal={false}
              />
              <XAxis type="number" {...axis} />
              <YAxis type="category" dataKey="action" width={104} {...axis} />
              <Tooltip {...chartTooltip} />
              <ReferenceLine x={0} stroke="var(--muted-foreground)" />
              <Bar dataKey="delta" name="Mark change next sem" barSize={14} radius={[0, 6, 6, 0]}>
                {effect.map((e) => (
                  <Cell key={e.action} fill={e.delta >= 0 ? "var(--chart-1)" : "var(--chart-2)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Mean change in the learner's average mark the semester after each logged action (
            {INTERVENTION_DATA.total} records).
          </p>
        </Panel>

        <Panel title="Support funnel" delay={300}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={FUNNEL} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid
                stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
                vertical={false}
              />
              <XAxis
                dataKey="stage"
                {...axis}
                interval={0}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              />
              <YAxis {...axis} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--chart-3)" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Only {FUNNEL[2]?.count ?? 0} of {FUNNEL[1]?.count ?? 0} flagged learners have a logged
            intervention — the biggest coverage gap. {IMPROVED.rate}% of flagged learners improved
            the following semester.
          </p>
        </Panel>
      </div>

      <Panel title="Areas of concern recorded by lecturers" delay={320}>
        <div className="space-y-1.5">
          {INTERVENTION_DATA.byConcern.map((c) => (
            <div key={c.key} className="text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span className="text-foreground">{c.key}</span>
                <span className="font-mono">{c.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-neon"
                  style={{
                    width: `${(c.count / (INTERVENTION_DATA.byConcern[0]?.count ?? 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Logged interventions per semester" delay={340}>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart
            data={INTERVENTION_DATA.byTerm}
            margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
          >
            <CartesianGrid
              stroke="color-mix(in oklab, var(--neon) 14%, transparent)"
              vertical={false}
            />
            <XAxis dataKey="term" {...axis} />
            <YAxis {...axis} />
            <Tooltip {...chartTooltip} />
            <Bar
              dataKey="count"
              name="Actions logged"
              radius={[6, 6, 0, 0]}
              fill="var(--chart-1)"
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {INTERVENTION_DATA.total} actions recorded by {INTERVENTION_DATA.byLecturer.length}{" "}
          lecturers across the intervention log.
        </p>
      </Panel>

      <Panel title="Suggested action checklist" delay={380}>
        <ul className="space-y-1.5 text-xs">
          {[
            `Schedule remedial slots for ${worstModules[0]?.code ?? "the weakest module"} before the week 6 assessment`,
            `Contact the ${lowAttendance.length.toLocaleString()} learners under 82% attendance with a recovery plan`,
            `Log every action taken — only ${FUNNEL[2]?.count ?? 0} of ${FUNNEL[1]?.count ?? 0} flagged learners have a record`,
            "Re-run this analysis after the next mid-semester upload",
          ].map((task) => (
            <li key={task} className="flex items-start gap-2 text-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              {task}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "neon" | "magenta" }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value * 10}%`,
            background: tone === "neon" ? "var(--neon)" : "var(--magenta)",
          }}
        />
      </div>
    </div>
  );
}

export function ActivityView({
  log,
}: {
  log: { agent: AgentKey; question: string; at: number }[];
}) {
  return (
    <div className="mt-3">
      <Panel title="Session routing timeline" delay={0}>
        {log.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No agent runs recorded yet in this thread.
          </p>
        ) : (
          <ol className="space-y-2">
            {log.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="relative pl-5 text-xs">
                <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-neon shadow-[0_0_10px_var(--neon)]" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-neon">
                  {AGENTS[entry.agent].label}
                </p>
                <p className="text-foreground">{entry.question}</p>
                <p className="text-muted-foreground">
                  {new Date(entry.at).toLocaleTimeString()} · {AGENTS[entry.agent].blurb}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <p className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <ArrowUpRight className="h-3 w-3" /> Expand any routing pill to inspect a full trace
      </p>
    </div>
  );
}

