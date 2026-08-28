import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck, UserRound } from "lucide-react";
import { CyberBackground } from "@/components/campus/CyberBackground";
import { BrandMark } from "@/components/campus/BrandMark";
import { ThemeToggle } from "@/components/campus/ThemeToggle";
import { useCampus } from "@/lib/chat-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Flair 2.0 — Educator AI Console Login" },
      {
        name: "description",
        content:
          "Sign in to Campus Flair 2.0, the AI console where educators query student records, analytics and recommendations across their cohorts.",
      },
      { property: "og:title", content: "Campus Flair 2.0 — Educator AI Console" },
      {
        property: "og:description",
        content:
          "Query, analyse and act on student data through a multi-agent AI console built for educators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthLanding,
});

function AuthLanding() {
  const { signIn, createThread } = useCampus();
  const navigate = useNavigate();
  const [educatorId, setEducatorId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fall back to the DOM values so browser autofill (which can skip React
    // onChange) still counts as filled in.
    const id = (educatorId || idRef.current?.value || "").trim();
    const pw = (password || pwRef.current?.value || "").trim();
    if (!id || !pw) {
      setError("Educator ID and password are both required.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      // Surface failures instead of leaving the button stuck on
      // "Authenticating…" — this runs in a timer, so a throw here would
      // otherwise be invisible.
      try {
        // Sent verbatim as `lecturer_id`. The backend partitions history on
        // the exact string, so casing is significant — `Lecturer4` and
        // `LECTURER4` are two different lecturers.
        signIn(id.trim());
        const threadId = createThread();
        void navigate({ to: "/console/$threadId", params: { threadId } });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Couldn't open the console.");
        setLoading(false);
      }
    }, 900);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <CyberBackground intense />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="cf-rise mb-6 flex flex-col items-center text-center">
          <BrandMark size={78} withText={false} priority />
          <h1 className="mt-4 font-display text-3xl font-black uppercase tracking-[0.2em] text-gradient-brand">
            Campus Flair
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.5em] text-neon">version 2.0</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Multi-agent intelligence for educators. Query records, surface analytics, act on
            recommendations.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="glass cf-rise relative overflow-hidden rounded-2xl p-6 shadow-[var(--glow-neon)]"
          style={{ animationDelay: "120ms" }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "var(--gradient-brand)" }}
          />
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Educator ID
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-neon/25 bg-background/40 px-3 focus-within:border-neon">
            <UserRound className="h-4 w-4 text-neon" />
            <input
              ref={idRef}
              value={educatorId}
              onChange={(e) => setEducatorId(e.target.value)}
              placeholder="Lecturer4"
              autoComplete="username"
              className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-neon/25 bg-background/40 px-3 focus-within:border-neon">
            <Lock className="h-4 w-4 text-neon" />
            <input
              ref={pwRef}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-neon"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="relative mt-6 w-full overflow-hidden rounded-xl py-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-70"
            style={{ background: "var(--gradient-brand)" }}
          >
            {loading ? "Authenticating…" : "Enter console"}
            {loading ? <span className="absolute inset-0 cf-shimmer" /> : null}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> Your Educator ID selects whose
            conversations load — the password isn’t checked yet
          </p>
        </form>
      </div>
    </main>
  );
}
