import React from "react";
import { Link as LinkIcon, ArrowUpRight } from "lucide-react";

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
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/40 flex items-center justify-between rounded-xl border p-4 transition-colors"
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                <LinkIcon className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-medium">{link.name || url}</div>
                <div className="text-muted-foreground truncate font-mono text-xs">{url}</div>
              </div>
            </div>
            <div className="shrink-0">
              <ArrowUpRight className="text-muted-foreground h-5 w-5" />
            </div>
          </a>
        );
      })}
    </div>
  );
}
