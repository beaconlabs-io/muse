import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HYPERCERTS_URL } from "@/configs/hypercerts";
import { HypercertListFragment } from "@/types/hypercerts/fragments/hypercert-list.fragment";

// TODO: remove
const CHAIN_NAMES: Record<number, string> = {
  10: "Optimism",
  42220: "Celo",
  11155111: "Sepolia",
  84532: "Base Sepolia",
};

export function Hypercert({ hypercert }: { hypercert: HypercertListFragment }) {
  const chainId = hypercert.contract?.chain_id;
  const chainName = chainId ? CHAIN_NAMES[Number(chainId)] || `${chainId}` : "Unknown";

  return (
    <Link
      href={`${HYPERCERTS_URL}/hypercerts/${hypercert.hypercert_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition-transform duration-300 hover:scale-[1.02]"
    >
      <article className="group border-border bg-muted relative overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-300 hover:shadow-lg">
        {/* Image Container */}
        <div className="from-muted to-muted/50 relative h-[320px] w-full overflow-hidden bg-gradient-to-br p-4">
          {/* Chain Badge */}
          <Badge
            variant="secondary"
            className="bg-background/90 absolute top-4 right-4 z-10 backdrop-blur-md"
          >
            {chainName}
          </Badge>

          <div className="relative h-full w-full">
            <Image
              src={`/api/hypercerts/${hypercert.hypercert_id}`}
              alt={hypercert?.metadata?.name ?? "Untitled"}
              height={500}
              width={500}
              className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
              priority={false}
              loading="lazy"
            />
          </div>

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Content Section */}
        <section
          className="border-t-border bg-background/95 group-hover:bg-background absolute bottom-0 flex w-full flex-col gap-2 border-t p-4 backdrop-blur-md transition-all duration-300"
          style={{
            boxShadow: "0 -10px 20px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Title */}
          <h3 className="text-foreground group-hover:text-primary leading-tight font-semibold transition-colors duration-200">
            {hypercert.metadata?.name ?? "[Untitled]"}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground group-hover:text-foreground line-clamp-2 h-10 text-sm text-ellipsis transition-colors duration-200">
            {hypercert.metadata?.description ?? "No description available"}
          </p>

          {/* External Link Indicator */}
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span>View details</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </section>
      </article>
    </Link>
  );
}
