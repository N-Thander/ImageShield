import { cn } from "@/lib/cn";

/** Consistent page gutters and max width for every route. */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-5 sm:p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </main>
  );
}
