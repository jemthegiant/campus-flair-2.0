import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/campus/BrandMark";
import { useCampus } from "@/lib/chat-store";

export const Route = createFileRoute("/console/")({
  head: () => ({
    meta: [
      { title: "Opening console — Campus Flair 2.0" },
      {
        name: "description",
        content: "Starting a new Campus Flair 2.0 educator session.",
      },
      { property: "og:title", content: "Campus Flair 2.0 Console" },
      { property: "og:description", content: "Starting a new educator AI session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsoleIndex,
});

function ConsoleIndex() {
  const { threads, createThread, educatorId } = useCampus();
  const navigate = useNavigate();

  // This route exists only to redirect. `createThread` changes `threads`, which
  // the effect reads — without the latch it would fire again and navigate a
  // second time while the destination route is already rendering.
  const redirected = useRef(false);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  useEffect(() => {
    if (redirected.current) return;

    if (!educatorId) {
      redirected.current = true;
      void navigate({ to: "/", replace: true });
      return;
    }

    // Reuse an empty scratch thread if one is lying around, but never drop the
    // user into a restored conversation they didn't pick.
    const blank = threadsRef.current.find(
      (t) => !t.parentId && t.loaded && t.messages.length === 0,
    );
    const id = blank ? blank.id : createThread();
    redirected.current = true;
    void navigate({ to: "/console/$threadId", params: { threadId: id }, replace: true });
  }, [createThread, navigate, educatorId]);

  return (
    <div className="grid flex-1 place-items-center">
      <div className="flex flex-col items-center gap-3">
        <BrandMark size={56} withText={false} priority />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-neon">Booting console…</p>
      </div>
    </div>
  );
}
