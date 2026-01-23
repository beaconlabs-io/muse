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
    <div className="mb-6">
      {title && <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>}
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        {date && <span>Created {date}</span>}
        {date && author && <span>•</span>}
        {author && <span>By {author}</span>}
        {version && (
          <>
            {(date || author) && <span>•</span>}
            <span>Version {version}</span>
          </>
        )}
        {strength && (
          <>
            {(date || author || version) && <span>•</span>}
            <StrengthIndicator level={strength} size="md" asLink />
          </>
        )}
      </div>
    </div>
  );
}
