"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { Checkbox } from "../ui/checkbox";

import { TableDropdown } from "./TableDropdown";
import { Evidence } from "@/types";
import Link from "next/link";
import { Star } from "lucide-react";

const columnHelper = createColumnHelper<Evidence>();

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  columnHelper.accessor("evidence_id", {
    id: "id",
    header: "ID",
    cell: ({ row }) => {
      return row.original.evidence_id;
    },
  }),
  columnHelper.accessor("title", {
    id: "title",
    header: "Title",
    cell: ({ row }) => {
      return (
        <Link
          href={`/evidence/${row.original.evidence_id}`}
          key={row.id}
          className="hover:bg-muted transition-colors cursor-pointer"
        >
          <p className="truncate max-w-[200px]">{row.original.title}</p>
        </Link>
      );
    },
  }),

  columnHelper.accessor("evidence_level", {
    id: "evidence_level",
    header: "Evidence Level",
    cell: ({ row }) => {
      const level = Number(row.original.evidence_level);
      const stars = Array.from({ length: 5 }, (_, i) => i < level);
      return (
        <div className="flex items-center gap-0.5">
          {stars.map((filled, i) =>
            filled ? (
              <Star
                key={i}
                size={18}
                className="text-yellow-400 fill-yellow-400"
              />
            ) : (
              <Star key={i} size={18} className="text-gray-300" />
            )
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor("effect", {
    id: "effect",
    header: "Effect",
    cell: ({ row }) => {
      return row.original.effect;
    },
  }),
  columnHelper.accessor("methodologies", {
    id: "methodology",
    header: "Methodology",
    cell: ({ row }) => {
      return (
        <p className="truncate max-w-[200px]">{row.original.methodologies}</p>
      );
    },
  }),
  columnHelper.accessor("tags", {
    id: "tags",
    header: "Tags",
    cell: ({ row }) => {
      return (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor("date", {
    id: "timeCreated",
    header: "Created At",
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
