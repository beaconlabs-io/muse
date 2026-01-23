import Link from "next/link";
import { EffectIcons } from "@/components/effect-icons";
import { StrengthIndicator } from "@/components/strength-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Evidence } from "@beaconlabs-io/evidence";

interface EvidenceCardProps {
  evidence: Evidence;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const validTags = evidence.tags?.filter((tag) => tag && tag.trim().length > 0) ?? [];
  const displayedTags = validTags.slice(0, 3);
  const extraTagCount = Math.max(0, validTags.length - 3);

  const results = evidence.results ?? [];
  const displayedResults = results.slice(0, 2);
  const extraResultCount = Math.max(0, results.length - 2);

  return (
    <Link href={`/evidence/${evidence.evidence_id}`} className="group block">
      <Card className="border-border/50 hover:border-primary/20 hover:bg-accent/5 relative h-full overflow-hidden transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <CardHeader className="relative space-y-3">
          <CardTitle className="group-hover:text-primary text-base leading-snug font-semibold transition-colors">
            {evidence.title}
          </CardTitle>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">{evidence.author}</span>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">{evidence.date}</span>
              {evidence.strength && <StrengthIndicator level={evidence.strength} size="sm" />}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative pt-0">
          <div className="space-y-2">
            {displayedResults.map((result, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="text-muted-foreground mt-0.5 shrink-0 scale-90">
                  {result.outcome && <EffectIcons effectId={result.outcome} isShowTitle={false} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-tight font-medium">{result.intervention}</div>
                  <div className="text-muted-foreground text-xs leading-relaxed">
                    &rarr; {result.outcome_variable}
                  </div>
                </div>
              </div>
            ))}
            {extraResultCount > 0 && (
              <div className="text-muted-foreground pl-8 text-xs">
                +{extraResultCount} more results
              </div>
            )}
          </div>

          {validTags.length > 0 && (
            <div className="border-border/50 mt-4 flex flex-wrap gap-1.5 border-t pt-3">
              {displayedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="hover:bg-secondary/80 rounded-full px-2 py-0 text-[10px] font-normal transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {extraTagCount > 0 && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0 text-[10px] font-normal transition-colors"
                >
                  +{extraTagCount}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
