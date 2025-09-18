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
        <Button variant="ghost" className="flex h-8 w-8 cursor-pointer p-0">
          <MoreHorizontal />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <div className="flex w-max flex-col items-center gap-2">
            <Link
              href={`https://base-sepolia.easscan.org/attestation/view/${row.original.attestationUID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="cursor-pointer" variant="outline">
                View on EAS scan
              </Button>
            </Link>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
