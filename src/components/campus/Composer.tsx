import { useEffect, useRef, useState } from "react";
import { Plus, Mic, MicOff, SendHorizonal, Square } from "lucide-react";
import { toast } from "sonner";
import { useCampus } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODELS = ["AWS Bedrock", "AWS Bedrock (Fast)"] as const;

export function Composer({
  onSend,
  onStop,
  busy,
  disabled,
  className,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { draft, setDraft } = useCampus();
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<string>(MODELS[0]);
  const [voiceMode, setVoiceMode] = useState(false);

  useEffect(() => {
    ref.current?.focus();
  }, [draft === "" ? "empty" : "filled"]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [draft]);

  const submit = () => {
    if (disabled) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSend(text);
  };

  const handleAttachment = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const names = Array.from(files)
      .map((f) => f.name)
      .join(", ");
    toast(`Attached ${files.length} file${files.length > 1 ? "s" : ""}: ${names}`, {
      description: "Attachments are preview-only for now.",
    });
    e.target.value = "";
  };

  const toggleVoice = () => {
    setVoiceMode((v) => {
      const next = !v;
      toast(next ? "Voice mode enabled" : "Voice mode disabled", {
        description: next ? "Tap the microphone again to stop." : "Text input restored.",
      });
      return next;
    });
  };

  return (
    <div
      className={cn("rounded-2xl border border-sidebar-border bg-sidebar p-3 shadow-sm", className)}
    >
      <div className="rounded-xl border border-border/70 bg-card p-2 shadow-inner">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="File attachment"
        />

        <textarea
          ref={ref}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            voiceMode ? "Listening… (voice demo)" : "Ask about a student, module or cohort…"
          }
          aria-label="Ask about a student, module or cohort"
          className="max-h-40 min-h-[40px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
        />

        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={handleAttachment}
            disabled={disabled}
            aria-label="Add attachment"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
          >
            <Plus className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <Select value={model} onValueChange={setModel} disabled={!!disabled}>
              <SelectTrigger
                aria-label="Select model"
                className="h-9 w-full max-w-[190px] gap-1.5 border-none bg-transparent px-2 text-xs font-medium text-muted-foreground shadow-none hover:text-foreground focus:ring-0 [&>svg]:hidden"
              >
                <span className="truncate">
                  <SelectValue />
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-0.5 shrink-0 opacity-60"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={toggleVoice}
            disabled={disabled}
            aria-label={voiceMode ? "Disable voice mode" : "Enable voice mode"}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
              voiceMode
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {voiceMode ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive text-destructive-foreground transition-transform hover:scale-105"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={disabled || draft.trim().length === 0}
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "var(--gradient-brand)" }}
            >
              <SendHorizonal className="h-4 w-4 -rotate-12" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">
        <span className="font-bold text-gold">Disclaimer:</span> This platform utilizes artificial
        intelligence to generate all system outputs. The content generated may be incorrect.
      </p>
    </div>
  );
}
