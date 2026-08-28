# Visuals driven by the real Campus Flair data

The two uploads give us far richer material than the invented cohort. Quick profile of what we actually have:

- **Performance file**: 146,048 rows, 2,608 students, 56 modules (STE001-STE056), 4 academic years (2023-2026) x 2 semesters, one faculty/course. 79 columns covering demographics, entry qualifications, mid-semester marks, attendance, CCA points, bursary flags, warning letters, and a full previous-cohort benchmark block per module.
- **Intervention file**: 560 logged actions with lecturer, student, module, area of concern (4 types) and intervention action taken (4 types), dated 2023-2026.
- `Final_Module_Mark` is a status flag (A / E / I), not a score — `Mid_Semester_Module_Mark` (0-99) is the numeric performance signal, alongside `Cumulative_average_score`, `Semester_average_score` and `Percentage_of_lessons_missed`.

## Visual ideas by agent

### Analytics Agent
1. **Module benchmark strip** — for a module, plot the current mid-semester mark distribution against the built-in previous-cohort box stats (`10th percentile / median / 90th percentile / min / max / stdev`). Every module row already carries its own benchmark, so this needs no extra computation and instantly answers "is this cohort worse than last year?"
2. **Grade-mix comparison bars** — stacked A/B/C/D/F percentages from `Previous_cohort_*_grade_Percentage` versus this cohort's projected mix from mid-semester marks.
3. **Attendance vs attainment scatter** — `Percentage_of_lessons_missed` on x, `Mid_Semester_Module_Mark` on y, dots coloured by warning-letter flag, with a fitted trend line. The single most persuasive "attendance matters" visual.
4. **Semester trajectory line** — `2Sem_Ago_Avg_Mod_Score` to `Prev_Sem_Avg_Mod_Score` to `Semester_average_score` per student or cohort, with slope highlighting decliners.
5. **Module heatmap** — 56 modules x semester grid coloured by average mark, so a programme lead spots persistently weak modules at a glance.
6. **Entry-qualification cohort bars** — average attainment split by `Entry_Qualification_Code`, `Admission_Type` (M/D) and `Standardized_PrePoly_Score` band, to see which intake pathways need more scaffolding.
7. **CCA vs academic quadrant** — `Mid_Sem_Total_CCA_Point_Percentile` against academic score, four quadrants (all-rounder / academic-focused / activity-focused / disengaged).

### Retrieval Agent (single student view)
8. **Student radar** — attainment, attendance, CCA participation, leadership, quiz attempts, cumulative GPA on one normalised radar against cohort median.
9. **Module scorecard table** — every module the student took, with their mark, the previous-cohort median, and a delta chip.
10. **Timeline strip** — semester-by-semester CGPA with warning letters, bursary receipt and interventions marked as events.

### Risk / Recommendation Agent
11. **Risk composite gauge** — a transparent score built from missed lessons, mark-vs-benchmark gap, warning letter, quiz attempts and CCA percentile, with a contribution breakdown bar so the educator sees *why* a student scored what they did.
12. **At-risk funnel** — cohort → flagged → intervened → recovered, using the intervention log joined to the following semester's score.
13. **Intervention effectiveness chart** — average score change after each of the 4 intervention actions, grouped by area of concern. This turns the 560-row log into the "what actually works" answer.
14. **Lecturer intervention load** — actions per lecturer per semester, to spot uneven support coverage.
15. **Equity lens (privacy-gated)** — attainment by `Per_Capita_Income_Range`, SEN flag and bursary status, shown only in aggregate with a minimum group size so no individual is identifiable.

### Dashboard Agent
16. Extend the BI catalogue filter vocabulary to the real fields — module codes STE001-STE056, academic year, semester, level of study, entry qualification, warning-letter flag — so deep links carry the same filters the charts use.

## What I would build first

A focused set of five: attendance-vs-attainment scatter, module benchmark strip, semester trajectory, intervention effectiveness, and the student radar. Together they cover retrieval, analytics and recommendation without overloading a chat bubble.

## Technical notes

- The 146k-row CSV is too heavy to ship raw to the browser. Precompute a compact JSON at build time: per-module aggregates and benchmarks, per-student summary rows (one row per student-semester rather than per module), and the intervention rollups. Target well under 1 MB and load it as a static asset.
- Keep the full row-level file out of the repo; derive the summary from `/mnt/user-uploads` in a one-off script and commit only the generated JSON.
- Replace `src/lib/campus-data.ts` fixtures with the generated dataset, keeping the same exported shapes so `campus-agents.ts` and `DataViews.tsx` need only additive changes.
- Charts stay on Recharts with the existing neon tokens; new chart types needed are scatter, box/range strip, heatmap grid and radar (radar already exists).
- Student names are placeholders ("Name of 1802320"); keep them and treat student numbers as opaque IDs in the UI.

## Open question

Do you want the app to use this real sample data as its demo dataset (replacing the invented 24-student cohort), or keep the invented data and only use these columns as a schema guide for the charts?
