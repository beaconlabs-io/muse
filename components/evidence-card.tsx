import Link from "next/link";
import { EffectIcons } from "@/components/effect-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Evidence } from "@/types";

interface EvidenceCardProps {
  evidence: Evidence;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const results = evidence.results ?? [];
  const validTags = evidence.tags?.filter((tag) => tag && tag.trim().length > 0) ?? [];

  return (
    <Link href={`/evidence/${evidence.evidence_id}`} className="group block">
      <Card className="border-border/50 hover:bg-accent/5 h-full transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
        <CardHeader className="space-y-2">
          <CardTitle className="group-hover:text-primary text-lg leading-snug font-semibold transition-colors">
            {evidence.title}
          </CardTitle>
          <CardDescription className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-2">
            <span className="font-medium">{evidence.author}</span>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <span className="text-muted-foreground">{evidence.date}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {validTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {validTags.slice(0, 4).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="hover:bg-secondary/80 rounded-full px-2.5 py-1 text-xs transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {validTags.length > 4 && (
                <Badge
                  variant="outline"
                  className="hover:bg-secondary/80 rounded-full px-2.5 py-1 text-xs transition-colors"
                >
                  +{validTags.length - 4}
                </Badge>
              )}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <div className="text-muted-foreground mt-0.5 shrink-0">
                  {result.outcome && <EffectIcons effectId={result.outcome} isShowTitle={false} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-tight font-medium">{result.intervention}</div>
                  <div className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    → {result.outcome_variable}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
