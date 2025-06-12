"use client";

import React from "react";
import Link from "next/link";
import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Evidence } from "@/types";

interface DataTableRowActionsProps<TData> {
  row: Row<TData & Evidence>;
}

export function TableDropdown<TData>({ row }: DataTableRowActionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 cursor-pointer">
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <div className="flex flex-col gap-2 items-center w-max">
            <Link
              // TODO: Update the URL
              href={`https://base-sepolia.easscan.org/attestation/view/${row.original.evidence_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="cursor-pointer" variant="outline">
                View row evidence
              </Button>
            </Link>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
