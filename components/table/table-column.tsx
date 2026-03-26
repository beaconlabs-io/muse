"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { EffectIcons } from "@/components/effect-icons";
import { StarsComponent } from "@/components/stars";
import { TableDropdown } from "@/components/table/TableDropdown";
import { TooltipStrength } from "@/components/tooltip/tooltip-strength";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipEffects } from "../tooltip/tooltip-effects";
import type { Evidence } from "@beaconlabs-io/evidence";
import { Link } from "@/i18n/routing";

const columnHelper = createColumnHelper<Evidence>();

export function useColumns() {
  const t = useTranslations("table");

  return [
    columnHelper.accessor("results", {
      id: "results",
      header: () => {
        return (
          <div className="flex flex-row items-center gap-1">
            {t("result")}
            <TooltipEffects />
          </div>
        );
      },
      cell: ({ row }) => {
        const results = row.original.results;
        if (!results || results.length === 0) return null;

        return (
          <Link
            href={`/evidence/${row.original.evidence_id}`}
            className="flex cursor-pointer flex-col gap-2"
          >
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-2">
                {result.outcome && <EffectIcons effectId={result.outcome} isShowTitle={false} />}
                <div className="text-sm">{result.intervention}</div>
                <div className="text-sm">&rarr;</div>
                <div className="text-sm">{result.outcome_variable}</div>
              </div>
            ))}
          </Link>
        );
      },
    }),
    columnHelper.accessor("methodologies", {
      id: "methodology",
      header: t("methodology"),
      cell: ({ row }) => {
        return <p className="max-w-[200px] truncate">{row.original.methodologies}</p>;
      },
    }),
    columnHelper.accessor("tags", {
      id: "tags",
      header: t("tags"),
      cell: ({ row }) => {
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.tags?.map((tag, index) => (
              <Badge variant="secondary" key={index}>
                {tag}
              </Badge>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor("strength", {
      id: "strength",
      header: ({ column }) => (
        <div className="flex flex-row items-center gap-1">
          {t("evidenceLevel")}
          <TooltipStrength />
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const level = Number(row.original.strength);
        return <StarsComponent max={level} />;
      },
    }),
    columnHelper.accessor("date", {
      id: "timeCreated",
      header: t("createdAt"),
      cell: ({ row }) => {
        return row.original.date;
      },
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        return <TableDropdown row={row} />;
      },
    }),
  ] as ColumnDef<Evidence>[];
}
