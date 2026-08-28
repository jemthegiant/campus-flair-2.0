# Dashboard Agent — BI deep-link responses

Add a fifth agent that answers dashboard-oriented prompts by picking the right BI dashboard (Power BI, Tableau, or AWS QuickSight), translating the prompt into filters, and returning a **link card** with the filtered URL. Demo only — mock dashboard registry, no credentials, no backend.

## What the educator sees

Prompt: "Open the Discrete Mathematics attendance dashboard for CS-2401"

Response bubble contains:
- "Routed to Dashboard Agent" indicator at the top (same style as the other agents).
- A short body line explaining which dashboard was matched and why.
- A **link card**: platform badge (Power BI / Tableau / QuickSight) with its brand-neutral neon styling, dashboard title, owning team, last-refreshed timestamp, applied-filter chips ("Module: Discrete Mathematics", "Cohort: CS-2401", "Term: 2"), the generated URL shown in monospace with a copy button, and an "Open in dashboard" button that opens in a new tab.
- If a requested filter has no matching field, an amber note listing what was dropped.
- "You might also ask…" suggestions and the usual copy / view sources / branch footer.

Sample-question chips gain a new **Dashboards** group.

## Mock dashboard registry

A handful of invented dashboards, each with platform, base URL, title, owner, refresh cadence, and a filter schema describing which fields it accepts and how they serialise:

| Dashboard | Platform | Filters |
| --- | --- | --- |
| Cohort Attainment Overview | Power BI | module, cohort, term |
| Attendance & Engagement Tracker | Tableau | module, cohort, week range |
| Learner Risk Watchlist | QuickSight | cohort, risk tier, term |
| Module Comparison Benchmark | Power BI | module (multi), term |

Filter values are validated against the existing modules/cohorts in `src/lib/campus-data.ts`, so the URLs reference real demo entities.

## URL construction (per platform, realistic syntax)

- **Power BI**: `?filter=Modules/ModuleName eq 'Discrete Mathematics' and Cohorts/Code eq 'CS-2401'` — `and`-joined OData, `in ('a','b')` for multi-value.
- **Tableau**: query params `?Module=Discrete%20Mathematics&Cohort=CS-2401&:embed=y&:toolbar=top`, values URL-encoded, comma-joined for multi-value.
- **QuickSight**: hash parameters `#p.Module=Discrete%20Mathematics&p.Cohort=CS-2401` appended to the share URL.

Each builder lives behind one interface so a real integration later only swaps the base URL and adds token generation.

## Routing

The intent classifier gains dashboard keywords ("dashboard", "power bi", "tableau", "quicksight", "open the", "filtered view", "drill into", "embed", "report link"). Dashboard intent is checked before analytics so "show me the analytics dashboard" routes to the Dashboard Agent, while "how is cohort CS-2401 performing" still goes to Analytics. The agent trace shows the real steps: intent classification, dashboard selection with match score, filter extraction and validation, URL serialisation.

## Technical notes

- New `src/lib/dashboard-registry.ts`: dashboard definitions, filter schemas, and the three URL builders.
- `src/lib/campus-agents.ts`: add `dashboard` to `AgentKey` and `AGENTS`, add `{ kind: "dashboard", payload }` to `ResponseView`, extend `classify()`, add the response branch with sources (dashboard catalogue, data dictionary, refresh log) and suggestions.
- `src/components/campus/DataViews.tsx`: new `DashboardLinkCard` view, using existing glass/neon tokens and `--gold` for the dropped-filter warning; no new colour literals.
- `src/components/campus/ChatMessages.tsx`: render the new view kind.
- Sample questions in `campus-agents.ts` gain the Dashboards group.
- No new dependencies, no backend, no route changes.

## Path to a real integration (not built now)

When you want live dashboards: enable Lovable Cloud, store workspace/report IDs and credentials as secrets, and generate embed tokens in a server function — Power BI via AAD service principal, QuickSight via `GenerateEmbedUrlForRegisteredUser`, Tableau via Connected Apps JWT. The registry and URL-builder interface stay the same; only the base URL and token step change.
