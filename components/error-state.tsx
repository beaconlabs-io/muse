import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Technical detail (error digest, invalid ID, etc.) shown in monospace */
  detail?: string;
  /** Action buttons or links */
  children?: React.ReactNode;
  className?: string;
}

export function ErrorState({ title, description, detail, children, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-20 text-center",
        className,
      )}
    >
      <CircleAlert className="text-destructive/70 size-8" />
      <p className="font-display text-xl">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      )}
      {detail && (
        <p className="text-muted-foreground bg-muted max-w-full overflow-x-auto rounded-md px-3 py-1.5 font-mono text-xs">
          {detail}
        </p>
      )}
      {children && <div className="mt-2 flex items-center gap-3">{children}</div>}
    </div>
  );
}
