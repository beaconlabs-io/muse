"use client";

import React from "react";
import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Evidence } from "@beaconlabs-io/evidence";

interface DataTableRowActionsProps<TData> {
  row: Row<TData & Evidence>;
}

export function TableDropdown<TData>({ row }: DataTableRowActionsProps<TData>) {
  const t = useTranslations("table");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 cursor-pointer p-0">
          <MoreHorizontal />
          <span className="sr-only">{t("openMenu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <div className="flex w-max flex-col items-center gap-2">
            <a
              href={`https://base-sepolia.easscan.org/attestation/view/${row.original.attestationUID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="cursor-pointer" variant="outline">
                {t("viewOnEAS")}
              </Button>
            </a>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
