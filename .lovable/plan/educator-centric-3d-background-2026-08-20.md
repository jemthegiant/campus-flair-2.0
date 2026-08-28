# Educator-Centric 3D Background

Replace the abstract floating lamps behind the chat with a blended scene: a slow **holographic knowledge graph** plus **floating academic geometries**, still soft enough not to compete with the chat.

## What you'll see

- A dim constellation of glowing nodes connected by thin neon lines, drifting slowly in 3D depth — reads as a live knowledge/curriculum graph. A few nodes gently pulse, and the light travels along a connection now and then.
- Behind and between them, a handful of translucent wireframe academic shapes (open book form, graduation-cap tetrahedron, cube, ring/orbit) tumbling very slowly at different depths.
- The existing floor grid, scene sway, and vignette stay, so the chat stays readable.
- Same design tokens (neon, magenta, chart accents), so it works in both light and dark mode, and it keeps animating regardless of reduced-motion settings, as before.

## Technical notes

- Rewrite `src/components/campus/LightField.tsx` into a layered scene:
  - `GraphLayer`: an inline SVG of ~14 nodes with fixed coordinates and ~20 edges, placed on 3 depth planes (`translateZ`) inside the existing `.cf-stage`; nodes are small radial-glow circles, edges are stroked lines with low opacity and an animated `stroke-dashoffset` pulse on a subset.
  - `GeometryLayer`: 4-5 CSS `preserve-3d` wireframe shapes built from bordered divs (cube faces, ring, tetrahedron-ish plates, book spread), each with its own slow rotate/drift duration and delay.
  - Keep 2-3 of the existing soft lamps as ambient fill so the space isn't flat.
- Add keyframes in `src/styles.css`: `cf-node-pulse`, `cf-edge-flow`, `cf-geo-tumble`, `cf-geo-drift`; reuse `cf-stage-sway` and `cf-floor`. Exclude the new classes from the `prefers-reduced-motion` block, matching current behavior.
- Colors via `color-mix(in oklab, var(--neon)/var(--magenta)/var(--chart-4) …, transparent)`; no hardcoded hex.
- `src/routes/console.tsx` keeps rendering `<LightField />`; no API change.
- Keep overall opacity low (nodes ~0.5-0.7, edges ~0.25, geometries ~0.2) and heavy blur on depth layers so text contrast is unaffected.
