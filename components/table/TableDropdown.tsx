"use client";

import React from "react";

import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DecodedEvidence } from "@/types";
import Link from "next/link";

interface DataTableRowActionsProps<TData> {
  row: Row<TData & DecodedEvidence>;
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
              href={`https://base-sepolia.easscan.org/attestation/view/${row.original.id}`}
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
