import React from "react";
import { getTranslations } from "next-intl/server";

interface EvidenceTagsProps {
  tags: string[] | undefined;
}

export async function EvidenceTags({ tags }: EvidenceTagsProps) {
  if (!tags || tags.length === 0) return null;

  // Filter out empty tags
  const validTags = tags.filter((tag) => tag.trim() !== "");

  if (validTags.length === 0) return null;

  const t = await getTranslations("evidence");

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-lg font-semibold">{t("tags")}</h3>
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
