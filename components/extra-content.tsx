import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chain, TransactionReceipt } from "viem";
import { generateBlockExplorerLink } from "@/utils/generateExploreLink";
import { HYPERCERTS_URL } from "@/utils/hypercertsConfig";

interface ExtraContentProps {
  message?: React.ReactNode;
  hypercertId: string;
  onClose?: () => void;
  chain: Chain;
  receipt?: TransactionReceipt;
}

export function ExtraContent({
  message = "Your hypercert has been minted successfully!",
  hypercertId,
  chain,
  receipt,
}: ExtraContentProps) {
  return (
    <div className="flex flex-col space-y-2">
      <p className="text-lg font-medium">Success</p>
      <p className="text-sm font-medium">{message}</p>
      <div className="flex justify-center space-x-4 py-4">
        <Button asChild>
          <a
            href={`${HYPERCERTS_URL}/hypercerts/${hypercertId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View hypercert <ExternalLink size={14} className="ml-2" />
          </a>
        </Button>

        {chain && receipt?.transactionHash && (
          <Button asChild>
            <a
              href={generateBlockExplorerLink(chain, receipt.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View transaction <ExternalLink size={14} className="ml-2" />
            </a>
          </Button>
        )}
      </div>
      <p className="text-sm font-medium">
        New ownership will not be immediately visible on the Hypercerts page, but will be visible in
        5-10 minutes.
      </p>
    </div>
  );
}

// For backwards compatibility
export const createExtraContent = ({
  receipt,
  hypercertId,
  chain,
}: {
  receipt: TransactionReceipt;
  hypercertId?: string;
  chain: Chain;
}) => {
  if (!hypercertId) return null;

  return <ExtraContent hypercertId={hypercertId} chain={chain} receipt={receipt} />;
};
