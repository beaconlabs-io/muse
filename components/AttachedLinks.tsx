import React from "react";
import Link from "next/link";
import { Link as LinkIcon, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";

type AttachedLink = {
  name: string;
  src: string;
};

export function AttachedLinks({ links }: { links: AttachedLink[] }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="space-y-3">
      {links.map((link, index) => {
        const url = link.src;
        return (
          <Link
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                <LinkIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-gray-900">
                  {link.name || url}
                </div>
                <div className="truncate text-sm text-gray-500">{url}</div>
              </div>
            </div>
            <div className="shrink-0">
              <ArrowUpRight className="h-5 w-5 text-gray-600" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
