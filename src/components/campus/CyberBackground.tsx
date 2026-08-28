export function CyberBackground({ intense = false }: { intense?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="absolute inset-0 cyber-grid cf-grid-scroll opacity-40" />
      <div
        className={`absolute -left-[20%] top-[-25%] h-[70vmax] w-[70vmax] rounded-full blur-3xl cf-drift ${
          intense ? "opacity-30" : "opacity-20"
        }`}
        style={{ background: "radial-gradient(circle, var(--neon), transparent 65%)" }}
      />
      <div
        className={`absolute -right-[15%] top-[10%] h-[60vmax] w-[60vmax] rounded-full blur-3xl cf-drift ${
          intense ? "opacity-25" : "opacity-16"
        }`}
        style={{
          background: "radial-gradient(circle, var(--magenta), transparent 65%)",
          animationDelay: "-14s",
        }}
      />
      <div
        className="absolute bottom-[-30%] left-[25%] h-[55vmax] w-[55vmax] rounded-full opacity-15 blur-3xl cf-drift"
        style={{
          background: "radial-gradient(circle, var(--chart-4), transparent 62%)",
          animationDelay: "-26s",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 32%, var(--background) 94%)",
        }}
      />
    </div>
  );
}
