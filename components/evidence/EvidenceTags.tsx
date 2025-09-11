import React from "react";

interface EvidenceTagsProps {
  tags: string[];
}

export function EvidenceTags({ tags }: EvidenceTagsProps) {
  if (!tags || tags.length === 0) return null;

  // Filter out empty tags
  const validTags = tags.filter(tag => tag.trim() !== "");
  
  if (validTags.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {validTags.map((tag, index) => (
          <span
            key={index}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}