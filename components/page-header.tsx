import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  className?: string;
}

/**
 * Editorial page heading: mono eyebrow label, serif display title,
 * optional lede paragraph, closed by a hairline rule.
 */
export function PageHeader({ eyebrow, title, lede, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-4 border-b pb-10", className)}>
      {eyebrow && (
        <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {lede && <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">{lede}</p>}
    </header>
  );
}
