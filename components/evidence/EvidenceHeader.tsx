import React from "react";

interface EvidenceHeaderProps {
  title: string;
  date: string;
  author: string;
  version?: string;
}

export function EvidenceHeader({ title, date, author, version }: EvidenceHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <div className="flex items-center text-sm text-gray-500 space-x-4">
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