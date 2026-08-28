import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { CornerDownRight, LogOut, MessageSquare, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { rootTitle } from "@/api/client";
import { useCampus } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  onNavigate,
  onCollapse,
}: {
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const { threads, createThread, deleteThread, educatorId, signOut, historyLoading } = useCampus();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };

  const [pending, setPending] = useState<{ id: string; title: string; branch: boolean } | null>(
    null,
  );
  const [signOutOpen, setSignOutOpen] = useState(false);

  const roots = threads.filter((t) => !t.parentId);
  const branchCount = pending ? threads.filter((t) => t.parentId === pending.id).length : 0;

  const startNew = () => {
    const id = createThread();
    onNavigate?.();
    void navigate({ to: "/console/$threadId", params: { threadId: id } });
  };

  return (
    <div className="flex h-full flex-col gap-3 border-r border-sidebar-border bg-sidebar/70 p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <Link to="/console" onClick={onNavigate}>
          <BrandMark size={34} />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse chat history"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={startNew}
        className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Plus className="h-4 w-4" /> New chat
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Chat history
        </p>
        {historyLoading ? (
          <p className="px-1 text-xs text-muted-foreground">Loading your sessions…</p>
        ) : roots.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">No sessions yet — start a new chat.</p>
        ) : null}
        <ul className="space-y-0.5">
          {roots.map((root) => (
            <li key={root.id}>
              <ThreadRow
                id={root.id}
                title={root.title}
                active={params.threadId === root.id}
                onNavigate={onNavigate}
                onDelete={() => setPending({ id: root.id, title: root.title, branch: false })}
              />
              <ul>
                {threads
                  .filter((t) => t.parentId === root.id)
                  .map((branch) => (
                    <li key={branch.id}>
                      <ThreadRow
                        id={branch.id}
                        title={rootTitle(branch.title)}
                        active={params.threadId === branch.id}
                        branch
                        onNavigate={onNavigate}
                        onDelete={() =>
                          setPending({
                            id: branch.id,
                            title: rootTitle(branch.title),
                            branch: true,
                          })
                        }
                      />
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Signed in
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-sidebar-foreground">{educatorId ?? "Guest"}</p>
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            aria-label="Sign out"
            className="rounded-md p-1 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="glass border-neon/25">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete {pending?.branch ? "branch" : "chat"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{pending?.title}” will be permanently deleted from the server
              {branchCount > 0
                ? `, along with ${branchCount} branch${branchCount > 1 ? "es" : ""}`
                : ""}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) deleteThread(pending.id);
                setPending(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="glass border-neon/25">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be returned to the login page. Your conversations are saved against your
              Educator ID and will be here when you sign back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSignOutOpen(false);
                signOut();
                void navigate({ to: "/" });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ThreadRow({
  id,
  title,
  active,
  branch,
  onNavigate,
  onDelete,
}: {
  id: string;
  title: string;
  active: boolean;
  branch?: boolean;
  onNavigate?: (() => void) | undefined;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
        active ? "bg-neon/15 text-foreground" : "hover:bg-sidebar-accent/60",
        branch && "ml-4",
      )}
    >
      <Link
        to="/console/$threadId"
        params={{ threadId: id }}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
      >
        {branch ? (
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-magenta" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-neon" />
        )}
        <span className="truncate text-sidebar-foreground">{title}</span>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${title}`}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
