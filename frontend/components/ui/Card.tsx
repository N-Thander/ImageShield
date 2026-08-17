import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/** White surface on the lavender page: hairline border, soft diffuse shadow. */
export function Card({ children, className, as: Tag = "section", ...rest }: CardProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        "rounded-2xl border border-hairline/70 bg-card p-5 shadow-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type CardHeaderProps = {
  title: string;
  id?: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
};

export function CardHeader({ title, id, hint, action, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
