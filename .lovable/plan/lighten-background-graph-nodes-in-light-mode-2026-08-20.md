# Lighten Background Graph Nodes in Light Mode

## Goal
Make the holographic knowledge-graph nodes in the chat background feel subtle and academic in light mode while keeping the current bright neon look in dark mode.

## Current state
- `src/components/campus/LightField.tsx` renders three depth planes of nodes/edges using `var(--neon)`, `var(--magenta)`, and `var(--chart-4)` as the hue.
- In light mode these tokens are dark saturated colors (`oklch(0.55...)`), so the nodes read as distracting dark specks against the light background.

## Plan
1. Add semantic background-graph color tokens in `src/styles.css`:
   - `--bg-graph-neon`
   - `--bg-graph-magenta`
   - `--bg-graph-accent`
   - In `:root` (light mode) set them to lighter, lower-chroma pastel tints.
   - In `.dark` set them to the current bright neon/magenta/chart values so the dramatic effect remains at night.
2. Update `src/components/campus/LightField.tsx` to pass these new tokens into `GraphPlane` instead of the raw `--neon`, `--magenta`, `--chart-4` tokens.
3. Keep the wireframe academic geometries (`WireCube`, `WireBook`, `WireTetra`, `WireRing`) using the existing bright tokens, since they are intentionally accent shapes and are already very transparent (`opacity: 0.22`).
4. Update the disclaimer and chatbar area in `src/components/campus/Composer.tsx` to match the left chat-history bar styling:
   - Replace the animated `glass` background on the input form with `bg-sidebar/70 border border-sidebar-border` (same as the sidebar container), so it sits cleanly against the chat area without extra background effects.
   - Remove the neon glow shadow and the animated focus glow.
   - Keep the send button and disclaimer text as-is, ensuring readability on the sidebar-toned bar.
5. Verify the console view renders a softer background graph in light mode, a crisp bright graph in dark mode, and a consistently styled composer bar in both themes.
