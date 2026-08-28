import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, PanelLeftOpen } from "lucide-react";
import { CyberBackground } from "@/components/campus/CyberBackground";
import { ChatSidebar } from "@/components/campus/ChatSidebar";
import { BrandMark } from "@/components/campus/BrandMark";
import { LightField } from "@/components/campus/LightField";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console")({
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden">
      <CyberBackground />

      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out md:block",
          collapsed ? "w-0" : "w-72",
        )}
      >
        <div className="h-full w-72">
          <ChatSidebar onCollapse={() => setCollapsed(true)} />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 cf-rise">
            <ChatSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <LightField />
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand chat history"
            className="absolute left-3 top-3 z-30 hidden rounded-lg border border-neon/30 bg-sidebar/80 p-2 text-neon backdrop-blur-md transition-colors hover:bg-sidebar md:block"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
        <header className="flex items-center gap-3 border-b border-border/60 px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle chat history"
            className="rounded-lg border border-neon/30 p-2 text-neon"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <BrandMark size={28} />
        </header>
        <Outlet />
      </div>
    </div>
  );
}

