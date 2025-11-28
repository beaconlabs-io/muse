interface EvidenceHeaderProps {
  title: string | undefined;
  date: string | undefined;
  author: string | undefined;
  version?: string | undefined;
}

export function EvidenceHeader({ title, date, author, version }: EvidenceHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <span>Created {date}</span>
        <span>•</span>
        <span>By {author}</span>
        {version && (
          <>
            <span>•</span>
            <span>Version {version}</span>
          </>
        )}
      </div>
    </div>
  );
}
