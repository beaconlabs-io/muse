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

  return (
    <Link href={`/evidence/${evidence.evidence_id}`} className="group block">
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">{evidence.title}</CardTitle>
          <CardDescription>
            <span className="mr-2">{evidence.author}</span>
            <span className="text-muted-foreground">{evidence.date}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {evidence.tags?.length ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {evidence.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                  {tag}
                </Badge>
              ))}
              {evidence.tags.length > 4 && (
                <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                  +{evidence.tags.length - 4}
                </Badge>
              )}
            </div>
          ) : null}
          <div>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="text-muted-foreground mt-0.5 shrink-0">
                  {result.outcome && <EffectIcons effectId={result.outcome} isShowTitle={false} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm leading-tight font-medium">{result.intervention}</div>
                  <div className="text-muted-foreground text-xs">→ {result.outcome_variable}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
