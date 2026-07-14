import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-20", className)}
      role="status"
    >
      <Spinner className="text-muted-foreground size-6" />
      {label && <p className="text-muted-foreground text-sm">{label}</p>}
    </div>
  );
}
