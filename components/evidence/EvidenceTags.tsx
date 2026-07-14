import React from "react";
import { getTranslations } from "next-intl/server";
import { SectionLabel } from "@/components/section-label";
import { Badge } from "@/components/ui/badge";

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
    <section>
      <SectionLabel>{t("tags")}</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {validTags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="rounded-full px-3 py-0.5 font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    </section>
  );
}
