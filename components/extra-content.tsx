"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Chain, TransactionReceipt } from "viem";
import { HYPERCERTS_URL } from "@/configs/hypercerts";
import { generateBlockExplorerLink } from "@/utils/generateExploreLink";
interface ExtraContentProps {
  message?: React.ReactNode;
  hypercertId: string;
  onClose?: () => void;
  chain: Chain;
  receipt?: TransactionReceipt;
}

export function ExtraContent({ message, hypercertId, chain, receipt }: ExtraContentProps) {
  const t = useTranslations("mintHypercert");

  return (
    <div className="flex flex-col space-y-2">
      <p className="text-lg font-medium">{t("successMessage")}</p>
      {message && <p className="text-sm font-medium">{message}</p>}
      <div className="flex justify-center space-x-4 py-4">
        <Button asChild>
          <a
            href={`${HYPERCERTS_URL}/hypercerts/${hypercertId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("viewHypercert")} <ExternalLink size={14} className="ml-2" />
          </a>
        </Button>

        {chain && receipt?.transactionHash && (
          <Button asChild>
            <a
              href={generateBlockExplorerLink(chain, receipt.transactionHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("viewTransaction")} <ExternalLink size={14} className="ml-2" />
            </a>
          </Button>
        )}
      </div>
      <p className="text-sm font-medium">{t("ownershipNote")}</p>
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
