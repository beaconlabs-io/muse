import { HypercertMinterAbi } from "@hypercerts-org/contracts";
import { decodeEventLog, getAddress } from "viem";
import type { TransactionReceipt } from "viem";

export const generateHypercertIdFromReceipt = (
  receipt: TransactionReceipt,
  chainId: number,
): string => {
  if (!receipt || !receipt.logs) {
    return "";
  }

  try {
    const events = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: HypercertMinterAbi,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .filter((event): event is NonNullable<typeof event> => event !== null);

    if (!events.length) {
      throw new Error("No events in receipt");
    }

    const claimEvent = events.find((e) => e.eventName === "ClaimStored");

    if (!claimEvent) {
      throw new Error("ClaimStored event not found");
    }

    const { args } = claimEvent;

    if (!args) {
      throw new Error("No args in event");
    }

    // Type assertion for the claimID argument
    const claimID = (args as any).claimID;

    if (!claimID) {
      throw new Error("No claimID arg in event");
    }

    const contractAddress = getAddress(receipt.to || "");
    const tokenId = claimID.toString();

    return `${chainId}-${contractAddress}-${tokenId}`;
  } catch (error) {
    console.error("Failed to generate hypercert ID:", error);
    return "";
  }
};
