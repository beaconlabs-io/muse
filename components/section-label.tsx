import { cn } from "@/lib/utils";

/**
 * Editorial section label: small mono uppercase heading used to mark
 * metadata sections (results, tags, change log, ...).
 */
export function SectionLabel({ children, className }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-muted-foreground mb-4 font-mono text-xs font-normal tracking-widest uppercase",
        className,
      )}
    >
      {children}
    </h3>
  );
}
