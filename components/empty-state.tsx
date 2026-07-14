import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-20 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground/60 [&_svg]:size-8">{icon}</div>}
      <p className="font-display text-xl">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
