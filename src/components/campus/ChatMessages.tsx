import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  FileText,
  GitBranch,
  Pencil,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AGENTS, type AgentKey } from "@/lib/campus-agents";
import { isStep, type ActivityItem } from "@/api/types";
import type { AssistantMessage, UserMessage } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

// The agent answers in GitHub-flavoured markdown: tables, ordered lists,
// headings, inline code. remark-gfm is what turns pipe rows into a real table.
const MD: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-display text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-display text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1 mt-2.5 font-display text-xs font-semibold uppercase tracking-wider text-neon first:mt-0">
      {children}
    </h4>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-neon underline-offset-4 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-neon/40 pl-2.5 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border/60" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border/70 px-3 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/40 px-3 py-1.5 align-top">{children}</td>
  ),
};

function AnswerBody({ text }: { text: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={MD}>
      {text}
    </Markdown>
  );
}

/**
 * The agent's working, kept available after the answer lands.
 *
 * `activity` interleaves steps with narration — text the agent emitted before a
 * step boundary discarded it — so rendering it in order reproduces the run
 * rather than showing steps and narration as two disconnected lists.
 */
function ProcessDisclosure({ agent, activity }: { agent: AgentKey; activity: ActivityItem[] }) {
  const [open, setOpen] = useState(false);
  const steps = activity.filter(isStep);
  const last = steps[steps.length - 1];

  return (
    <div className="mb-2.5 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <Sparkle className="h-3 w-3 shrink-0 text-neon" />
        <span className="truncate text-[11px] text-muted-foreground">
          Routed to {AGENTS[agent].label}
          {last ? ` · ${last.label}` : ""}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px] text-neon">
          {steps.length} step{steps.length === 1 ? "" : "s"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
          <p className="text-[11px] text-muted-foreground">{AGENTS[agent].blurb}</p>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No steps recorded for this turn.</p>
          ) : (
            <ol className="space-y-1.5">
              {activity.map((item, i) =>
                isStep(item) ? (
                  <li key={`s-${i}`} className="flex items-start gap-1.5 text-xs">
                    <Check
                      className={cn(
                        "mt-0.5 h-3 w-3 shrink-0",
                        item.status === "error" ? "text-destructive" : "text-neon",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="text-foreground">{item.label}</span>
                      {item.detail ? (
                        <span className="block text-muted-foreground">{item.detail}</span>
                      ) : null}
                    </span>
                    {item.ms !== undefined ? (
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-neon/70">
                        {item.ms} ms
                      </span>
                    ) : null}
                  </li>
                ) : (
                  <li
                    key={`n-${i}`}
                    className="border-l-2 border-neon/40 pl-2 text-xs italic text-muted-foreground"
                  >
                    {item.text}
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  };
  return { copied, copy };
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-neon/15 hover:text-neon"
    >
      {children}
    </button>
  );
}

export function UserBubble({
  message,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  editing,
}: {
  message: UserMessage;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (text: string) => void;
  editing?: boolean;
}) {
  const { copied, copy } = useCopy();
  const [value, setValue] = useState(message.text);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    setValue(message.text);
    const el = areaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${Math.min(200, el.scrollHeight)}px`;
    }
  }, [editing, message.text]);

  const save = () => {
    const text = value.trim();
    if (!text) return;
    onSubmitEdit(text);
  };

  if (editing) {
    return (
      <div className="cf-rise flex flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-magenta/50 bg-magenta/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-magenta">
          <Pencil className="h-3 w-3" />
          Editing this message
        </span>
        <div className="w-full max-w-[85%] rounded-2xl rounded-tr-sm border border-magenta bg-primary/80 p-2 ring-2 ring-magenta/40">
          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(200, e.currentTarget.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") onCancelEdit();
            }}
            aria-label="Edit your message"
            className="max-h-52 w-full resize-none bg-transparent px-2 py-1 text-sm text-primary-foreground outline-none"
          />
          <div className="mt-1 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
              className="h-7 rounded-full text-xs text-primary-foreground/80 hover:bg-background/20 hover:text-primary-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={value.trim().length === 0}
              className="h-7 rounded-full text-xs"
            >
              Save &amp; resend
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cf-rise flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-neon/30 bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[var(--glow-magenta)] transition-all">
        {message.text}
      </div>
      <div className="flex items-center gap-1 pr-1">
        <IconAction label="Copy message" onClick={() => void copy(message.text)}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </IconAction>
        <IconAction label="Edit message" onClick={onStartEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </IconAction>
      </div>
    </div>
  );
}

export function ThinkingBubble({
  statuses,
  step,
  reasoning,
}: {
  statuses: string[];
  step: number;
  reasoning?: string;
}) {
  const current = statuses[Math.min(step, statuses.length - 1)] ?? "Working…";
  const thought = reasoning?.trim();

  return (
    <div className="cf-rise glass max-w-[85%] rounded-2xl rounded-tl-sm p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neon cf-pulse-ring" />
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-neon">{current}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full cf-shimmer" />
      </div>
      <ul className="mt-2 space-y-0.5">
        {statuses.slice(0, step).map((s, i) => (
          <li
            key={`${s}-${i}`}
            className="font-mono text-[10px] text-muted-foreground line-through"
          >
            {s}
          </li>
        ))}
      </ul>
      {thought ? (
        <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap border-l-2 border-neon/40 pl-2 text-xs italic text-muted-foreground">
          {thought}
        </p>
      ) : null}
    </div>
  );
}

export function AssistantBubble({
  message,
  onSuggestion,
  onBranch,
}: {
  message: AssistantMessage;
  onSuggestion: (text: string) => void;
  onBranch: () => void;
}) {
  const { response } = message;
  // The stream is the typewriter. Text arrives token by token from the agent,
  // so there is nothing to animate — an interval that re-reveals a growing
  // string would restart from zero on every frame.
  const fullText = response.body.join("\n\n");
  const complete = !message.streaming;
  const { copied, copy } = useCopy();

  return (
    <div className="cf-rise space-y-2">
      <div className="glass rounded-2xl rounded-tl-sm p-4">
        {complete ? (
          <ProcessDisclosure agent={response.agent} activity={message.activity} />
        ) : null}

        <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">
          <AnswerBody text={fullText} />
          {message.streaming ? (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-neon" />
          ) : null}
        </div>

        {message.error ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </p>
        ) : null}

        {complete && !message.error ? (
          <>

            {response.suggestions.length > 0 ? (
              <div className="mt-4 cf-rise">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  You might also ask…
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {response.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSuggestion(s)}
                      className="rounded-full border border-magenta/40 bg-magenta/10 px-3 py-1 text-xs text-foreground transition-all hover:-translate-y-0.5 hover:border-magenta hover:bg-magenta/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
              <IconAction label="Copy response" onClick={() => void copy(fullText)}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </IconAction>

              <Popover>
                <PopoverTrigger className="text-xs text-neon underline-offset-4 hover:underline">
                  View sources ({response.sources.length})
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="max-h-[60vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto border-neon/30 bg-popover/95 backdrop-blur"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Grounded in {response.sources.length} records
                  </p>
                  <ul className="mt-2 space-y-2">
                    {response.sources.map((src, i) => (
                      <li
                        key={`${src.ref}-${i}`}
                        className="rounded-lg border border-border/70 p-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-neon" />
                          <p className="break-words text-xs font-semibold text-foreground">
                            {src.title}
                          </p>
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-neon/80">
                          <span className="text-muted-foreground">{src.kind}</span>
                          <span className="mt-0.5 block break-all">{src.ref}</span>
                        </p>
                        {src.excerpt ? (
                          <p className="mt-1 text-xs text-muted-foreground">{src.excerpt}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBranch}
                className={cn(
                  "ml-auto h-7 gap-1.5 rounded-full border-neon/40 text-xs hover:bg-neon/15",
                )}
              >
                <GitBranch className="h-3.5 w-3.5" />
                Branch from here
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
