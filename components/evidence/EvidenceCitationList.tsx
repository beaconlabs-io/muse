import { getTranslations } from "next-intl/server";
import { AttachedLinks } from "@/components/AttachedLinks";
import { SectionLabel } from "@/components/section-label";
import type { EvidenceCitation } from "@beaconlabs-io/evidence";

interface EvidenceCitationListProps {
  citations: EvidenceCitation[] | undefined;
}

export async function EvidenceCitationList({ citations }: EvidenceCitationListProps) {
  if (!citations || citations.length === 0) return null;

  const t = await getTranslations("evidence");
  const linkCitations = citations.filter((d) => d.type === "link" && d.src);
  const nonLinkCitations = citations.filter((d) => d.type !== "link");

  return (
    <section>
      <SectionLabel>{t("citation")}</SectionLabel>

      {linkCitations.length > 0 && (
        <AttachedLinks
          links={linkCitations.map((d) => ({
            name: d.name,
            src: d.src as string,
          }))}
        />
      )}

      {nonLinkCitations.length > 0 && (
        <ul className="text-foreground/80 marker:text-border mt-3 list-inside list-disc space-y-1 leading-relaxed">
          {nonLinkCitations.map((data, index) => (
            <li key={index}>{data.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
