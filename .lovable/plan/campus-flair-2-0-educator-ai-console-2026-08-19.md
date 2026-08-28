# Campus Flair 2.0 — Educator AI Console

A cyberpunk-campus themed chatbot workspace for educators, built as a fully interactive front-end demo: mock login, scripted multi-agent responses, invented demo cohort data, and session-only history.

## Design direction

- **Theme**: neon-noir campus. Deep indigo/near-black base, electric cyan primary, magenta secondary, amber for risk warnings. Light mode is a "daylight lab" inversion of the same palette (pale slate, saturated cyan/magenta accents) so both modes stay on-brand.
- **Type**: geometric-technical display face for headings/logo, clean grotesque for body. Monospace accents for agent status lines and IDs.
- **Motion**: animated gradient mesh + slow-drifting grid/particle field behind glass panels, scanline shimmer on the logo, typing/streaming text, staggered fade-ups for charts, animated status pills for agent routing. Reduced-motion respected.
- **Consistency**: one token set in `src/styles.css` (colors, gradients, glow shadows, glass surfaces) used across every view. No hardcoded colors.
- Dark/light toggle persisted for the session, available on both the landing page and the console.
- Fully responsive: sidebar collapses to a slide-over drawer on mobile, charts reflow, composer sticks to the bottom.

## Views

### 1. Auth landing (`/`)
- Animated neon-grid + drifting light-orb background, subtle parallax.
- Campus Flair 2.0 wordmark logo (generated asset) with glow.
- Educator ID + password fields, show/hide toggle, "Enter Console" button with loading shimmer.
- Mock auth: any non-empty credentials pass, stored in session memory, then routes to the console.
- Theme toggle in the corner.

### 2. Console (`/console`, `/console/$threadId`)
- **Left sidebar**: New Chat button, search, chat history grouped by Today/Earlier, and branch entries nested one indent level under their parent thread. Collapsible on desktop, drawer on mobile.
- **Main area**: blurred animated background behind a glass transcript column.
- **Empty state**: logo mark, greeting, and sample-question chips grouped by capability — Retrieval, Analytics, Recommendation, Student Risk, Agent Activity.
- **Composer**: placeholder "Ask about a student, module or cohort…", paper-plane submit button, disclaimer line above it: "Disclaimer: This platform utilizes artificial intelligence to generate all system outputs. The content generated may be incorrect."
- **User bubble**: copy + edit icon buttons (edit re-opens the text in the composer and regenerates).
- **Thinking state**: animated bubble stepping through statuses — "Classifying intent…", "Routing to Analytics Agent…", "Querying cohort records…", "Finalising output".
- **Assistant response** contains, in order:
  - "Routed to X Agent" header pill — clickable to expand the full agent trace (steps, tools called, timings, confidence).
  - The answer body: markdown text, plus embedded Analytics or Recommendations view when relevant.
  - "You might also ask…" suggestion chips that immediately post as a user bubble and trigger the next response.
  - Footer row: copy icon, "View sources (N)" opening a popover listing the referenced sources with type and excerpt, and "Branch from here" which forks a new nested thread in the sidebar.

### 3. Analytics view (in-bubble)
Rendered when the router picks the Analytics Agent: KPI stat tiles, trend line chart, cohort distribution bar chart, module comparison radar, and a sortable student table with risk badges. All neon-styled, animated on mount.

### 4. Recommendations view (in-bubble)
Ranked intervention cards with impact/effort scoring, target student chips, a projected-uplift chart, and a suggested action checklist.

### 5. Agent activity
Expandable trace inside every response, plus an "Agent Activity" sample-question path that renders a timeline of recent agent runs across the session.

## Demo data & routing logic

Invented cohort: ~24 students across modules such as Data Structures, Discrete Math, Systems Design; attendance, assessment scores, engagement, risk tiers; plus source documents (LMS records, gradebook exports, attendance logs, advising notes).

A keyword-based intent router picks one of five agents — Retrieval, Analytics, Recommendation, Student Risk, Orchestrator (agent activity) — and returns a scripted response with matching statuses, sources, suggestions, and view payload. Responses stream in character-by-character to feel live.

## Technical notes

- TanStack Start routes: `src/routes/index.tsx` (auth landing), `src/routes/console.tsx` (layout + sidebar), `src/routes/console.index.tsx`, `src/routes/console.$threadId.tsx`. Active thread comes from the route param; branches are threads with a `parentId`.
- Chat state in a React context provider, session-only (no persistence, no backend, no Lovable Cloud).
- Charts with Recharts; animation with CSS/Tailwind keyframes plus a light use of Motion for React for enter transitions.
- shadcn primitives for popover, dialog, tooltip, collapsible, scroll-area; sonner for toasts.
- Per-route `head()` metadata with Campus Flair 2.0 titles and descriptions.
- Generated logo asset in `src/assets`.
