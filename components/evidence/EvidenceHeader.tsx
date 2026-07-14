import { StrengthIndicator } from "@/components/strength-indicator";

interface EvidenceHeaderProps {
  title: string;
  date: string;
  author: string;
  version?: string;
  strength?: string;
}

export function EvidenceHeader({ title, date, author, version, strength }: EvidenceHeaderProps) {
  return (
    <header className="border-b pb-8">
      {title && (
        <h1 className="font-display mb-5 text-4xl leading-tight tracking-tight text-balance">
          {title}
        </h1>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
        {date && <span>Created {date}</span>}
        {author && (
          <>
            {date && <span className="text-border">/</span>}
            <span>By {author}</span>
          </>
        )}
        {version && (
          <>
            {(date || author) && <span className="text-border">/</span>}
            <span>Version {version}</span>
          </>
        )}
        {strength && (
          <>
            {(date || author || version) && <span className="text-border">/</span>}
            <StrengthIndicator level={strength} size="md" asLink />
          </>
        )}
      </div>
    </header>
  );
}
