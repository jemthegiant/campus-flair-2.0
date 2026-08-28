const LIGHTS = [
  { x: 14, y: 20, z: -520, size: 300, hue: "var(--neon)", delay: 0, dur: 28 },
  { x: 78, y: 16, z: -760, size: 380, hue: "var(--magenta)", delay: -8, dur: 36 },
  { x: 46, y: 74, z: -300, size: 240, hue: "var(--chart-4)", delay: -16, dur: 24 },
];

/** Knowledge-graph nodes in normalized 0-100 space, grouped by depth plane. */
const NODES = [
  { x: 12, y: 26, r: 3.1, dur: 6.5, delay: 0 },
  { x: 24, y: 14, r: 2.2, dur: 7.5, delay: -1.4 },
  { x: 31, y: 38, r: 3.8, dur: 5.8, delay: -2.6 },
  { x: 18, y: 58, r: 2.6, dur: 8.2, delay: -3.9 },
  { x: 39, y: 66, r: 3.2, dur: 6.9, delay: -0.8 },
  { x: 48, y: 24, r: 2.4, dur: 7.1, delay: -4.6 },
  { x: 56, y: 46, r: 4.2, dur: 6.2, delay: -2.1 },
  { x: 64, y: 18, r: 2.8, dur: 8.6, delay: -5.3 },
  { x: 71, y: 60, r: 3.4, dur: 6.6, delay: -1.9 },
  { x: 82, y: 32, r: 2.5, dur: 7.8, delay: -3.2 },
  { x: 88, y: 70, r: 3, dur: 6.1, delay: -4.9 },
  { x: 62, y: 82, r: 2.3, dur: 8.9, delay: -2.8 },
  { x: 34, y: 88, r: 2.7, dur: 7.3, delay: -6.1 },
  { x: 94, y: 12, r: 2, dur: 6.8, delay: -0.5 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 5],
  [2, 3],
  [2, 4],
  [2, 6],
  [3, 4],
  [4, 6],
  [4, 12],
  [5, 6],
  [5, 7],
  [6, 8],
  [6, 9],
  [7, 9],
  [7, 13],
  [8, 10],
  [8, 11],
  [9, 10],
  [11, 12],
  [9, 13],
];

const PLANES = [
  { z: -180, opacity: 0.85, blur: 0, scale: 1 },
  { z: -480, opacity: 0.5, blur: 1.5, scale: 1.15 },
  { z: -820, opacity: 0.3, blur: 3, scale: 1.35 },
];

function GraphPlane({
  z,
  opacity,
  blur,
  scale,
  hue,
  delay,
}: {
  z: number;
  opacity: number;
  blur: number;
  scale: number;
  hue: string;
  delay: number;
}) {
  return (
    <div
      className="cf-graph absolute inset-0"
      style={{
        transform: `translateZ(${z}px) scale(${scale})`,
        opacity,
        filter: blur ? `blur(${blur}px)` : undefined,
        animationDelay: `${delay}s`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <g
          stroke={`color-mix(in oklab, ${hue} 70%, transparent)`}
          strokeWidth={0.18}
          vectorEffect="non-scaling-stroke"
        >
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              className="cf-edge"
              x1={NODES[a]!.x}
              y1={NODES[a]!.y}
              x2={NODES[b]!.x}
              y2={NODES[b]!.y}
              style={{ animationDelay: `${-i * 0.7}s` }}
            />
          ))}
        </g>
        <g fill={`color-mix(in oklab, ${hue} 85%, transparent)`}>
          {NODES.map((n, i) => (
            <circle
              key={i}
              className="cf-node"
              cx={n.x}
              cy={n.y}
              r={n.r / 3.2}
              style={{
                animationDuration: `${n.dur}s`,
                animationDelay: `${n.delay}s`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function WireCube({ size, hue }: { size: number; hue: string }) {
  const half = size / 2;
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
    >
      {faces.map((t, i) => (
        <span
          key={i}
          className="cf-geo-face"
          style={{
            transform: t,
            borderColor: `color-mix(in oklab, ${hue} 55%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

/** Open-book form: two angled plates hinged at the spine. */
function WireBook({ size, hue }: { size: number; hue: string }) {
  const border = `1px solid color-mix(in oklab, ${hue} 55%, transparent)`;
  return (
    <div
      className="relative"
      style={{ width: size, height: size * 0.7, transformStyle: "preserve-3d" }}
    >
      {[-1, 1].map((dir) => (
        <span
          key={dir}
          className="absolute top-0 h-full w-1/2 rounded-sm"
          style={{
            left: dir < 0 ? 0 : "50%",
            border,
            transformOrigin: dir < 0 ? "right center" : "left center",
            transform: `rotateY(${dir * 28}deg)`,
            background: `linear-gradient(${dir < 0 ? "90deg" : "270deg"}, transparent, color-mix(in oklab, ${hue} 12%, transparent))`,
          }}
        />
      ))}
    </div>
  );
}

/** Graduation-cap style tetrahedron approximated with angled plates. */
function WireTetra({ size, hue }: { size: number; hue: string }) {
  const border = `1px solid color-mix(in oklab, ${hue} 55%, transparent)`;
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
    >
      {[0, 120, 240].map((a) => (
        <span
          key={a}
          className="absolute inset-0"
          style={{
            border,
            clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
            transform: `rotateY(${a}deg) rotateX(18deg) translateZ(${size / 3}px)`,
          }}
        />
      ))}
    </div>
  );
}

function WireRing({ size, hue }: { size: number; hue: string }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
    >
      {[0, 60, 120].map((a) => (
        <span
          key={a}
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid color-mix(in oklab, ${hue} 50%, transparent)`,
            transform: `rotateX(74deg) rotateZ(${a}deg)`,
          }}
        />
      ))}
      <span
        className="absolute rounded-full"
        style={{
          left: "50%",
          top: "50%",
          width: size * 0.12,
          height: size * 0.12,
          marginLeft: -size * 0.06,
          marginTop: -size * 0.06,
          background: `color-mix(in oklab, ${hue} 70%, transparent)`,
        }}
      />
    </div>
  );
}

type GeoDef = {
  kind: "cube" | "book" | "tetra" | "ring";
  x: number;
  y: number;
  z: number;
  size: number;
  hue: string;
  dur: number;
  driftDur: number;
  delay: number;
};

const GEOS: GeoDef[] = [
  { kind: "book", x: 20, y: 34, z: -340, size: 180, hue: "var(--neon)", dur: 90, driftDur: 34, delay: 0 },
  { kind: "cube", x: 74, y: 26, z: -620, size: 150, hue: "var(--magenta)", dur: 120, driftDur: 42, delay: -12 },
  { kind: "tetra", x: 58, y: 70, z: -420, size: 140, hue: "var(--chart-4)", dur: 105, driftDur: 38, delay: -6 },
  { kind: "ring", x: 34, y: 78, z: -260, size: 220, hue: "var(--neon)", dur: 140, driftDur: 46, delay: -20 },
  { kind: "cube", x: 90, y: 62, z: -880, size: 200, hue: "var(--chart-5)", dur: 160, driftDur: 52, delay: -28 },
];

function Geometry({ def }: { def: GeoDef }) {
  const Shape =
    def.kind === "cube"
      ? WireCube
      : def.kind === "book"
        ? WireBook
        : def.kind === "tetra"
          ? WireTetra
          : WireRing;
  return (
    <div
      className="cf-geo-orbit absolute"
      style={{
        left: `${def.x}%`,
        top: `${def.y}%`,
        transform: `translateZ(${def.z}px)`,
        animationDuration: `${def.driftDur}s`,
        animationDelay: `${def.delay}s`,
        opacity: 0.22,
      }}
    >
      <div
        className="cf-geo"
        style={{
          animationDuration: `${def.dur}s`,
          animationDelay: `${def.delay}s`,
        }}
      >
        <Shape size={def.size} hue={def.hue} />
      </div>
    </div>
  );
}

/**
 * Educator-centric 3D backdrop: a slow holographic knowledge graph layered in
 * depth, with translucent academic wireframe geometries tumbling behind it and
 * a few ambient lamps for fill. Tokens only, works in both themes.
 */
export function LightField() {
  return (
    <div aria-hidden className="cf-scene pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="cf-stage absolute inset-0">
        {LIGHTS.map((l, i) => (
          <span
            key={i}
            className="cf-lamp absolute rounded-full blur-3xl"
            style={{
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: l.size,
              height: l.size,
              marginLeft: -l.size / 2,
              marginTop: -l.size / 2,
              background: `radial-gradient(circle, color-mix(in oklab, ${l.hue} 60%, transparent), transparent 70%)`,
              transform: `translateZ(${l.z}px)`,
              animationDuration: `${l.dur}s, ${l.dur / 3}s`,
              animationDelay: `${l.delay}s, ${l.delay / 2}s`,
              opacity: 0.4,
            }}
          />
        ))}

        <div className="cf-layer absolute inset-0">
          {GEOS.map((g, i) => (
            <Geometry key={i} def={g} />
          ))}
        </div>

        <div className="cf-layer absolute inset-0">
          {PLANES.map((p, i) => (
            <GraphPlane
              key={i}
              z={p.z}
              opacity={p.opacity}
              blur={p.blur}
              scale={p.scale}
              hue={
                i === 1
                  ? "var(--bg-graph-magenta)"
                  : i === 2
                    ? "var(--bg-graph-accent)"
                    : "var(--bg-graph-neon)"
              }
              delay={-i * 9}
            />
          ))}
        </div>

        <div className="cf-floor absolute inset-x-[-30%] bottom-[-25%] h-[70%] cyber-grid opacity-25" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 30%, color-mix(in oklab, var(--background) 70%, transparent) 96%)",
        }}
      />
    </div>
  );
}
