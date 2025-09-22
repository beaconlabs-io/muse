import React from "react";

interface EvidenceTagsProps {
  tags: string[];
}

export function EvidenceTags({ tags }: EvidenceTagsProps) {
  if (!tags || tags.length === 0) return null;

  // Filter out empty tags
  const validTags = tags.filter((tag) => tag.trim() !== "");

  if (validTags.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {validTags.map((tag, index) => (
          <span key={index} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
