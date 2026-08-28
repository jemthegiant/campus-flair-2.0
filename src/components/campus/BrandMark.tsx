import logo from "@/assets/campus-flair-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = 44,
  withText = true,
  className,
  priority = false,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <span
          className="absolute inset-0 rounded-2xl blur-md"
          style={{ background: "var(--gradient-brand)", opacity: 0.28 }}
        />
        <img
          src={logo}
          alt="Campus Flair 2.0 emblem"
          width={size}
          height={size}
          loading={priority ? "eager" : "lazy"}
          className="relative h-full w-full object-contain"
        />
      </div>

      {withText ? (
        <div className="min-w-0 leading-none">
          <div className="truncate font-display text-base font-semibold tracking-tight text-foreground">
            Campus Flair
          </div>
        </div>
      ) : null}

    </div>
  );
}
