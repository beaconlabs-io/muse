"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HypercertClient,
  formatHypercertData,
  TransferRestrictions,
} from "@hypercerts-org/sdk";
import { toPng } from "html-to-image";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";
import { useAccount } from "wagmi";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HypercertCard from "./HypercertCard";
import { LogicModel } from "@/types";
import { uploadToIPFS } from "@/utils/ipfs";

// Zod schema for form validation
const hypercertFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  impactScope: z
    .string()
    .min(3, "Impact scope must be at least 3 characters")
    .max(50, "Impact scope must be less than 50 characters"),
});

type FormData = z.infer<typeof hypercertFormSchema>;

interface HypercertMintingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicModel: LogicModel;
  ipfsHash?: string;
}

type MintingStep = 1 | 2 | 3;
type MintingState =
  | "idle"
  | "storing-ipfs"
  | "generating-image"
  | "minting"
  | "success"
  | "error";

interface HypercertResult {
  claimId?: string;
  txHash: string;
}

const steps = [
  { id: 1, title: "Store Logic Model", description: "Storing on IPFS" },
  { id: 2, title: "Mint Hypercert", description: "Creating hypercert" },
  { id: 3, title: "Completed!", description: "Successfully minted" },
];

export function HypercertMintingDialog({
  open,
  onOpenChange,
  logicModel,
  ipfsHash: initialIpfsHash,
}: HypercertMintingDialogProps) {
  const [currentStep, setCurrentStep] = useState<MintingStep>(1);
  const [mintingState, setMintingState] = useState<MintingState>("idle");
  const [result, setResult] = useState<HypercertResult | null>(null);
  const [error, setError] = useState<string>("");
  const [hypercertImage, setHypercertImage] = useState<string>("");
  const [ipfsHash, setIpfsHash] = useState<string | undefined>(initialIpfsHash);
  const [ipfsProgress, setIpfsProgress] = useState<string>("Preparing...");

  const { address, isConnected } = useAccount();

  const form = useForm<FormData>({
    resolver: zodResolver(hypercertFormSchema),
    defaultValues: {
      title: logicModel.title || "",
      description: logicModel.description || "",
      impactScope: "",
    },
  });

  const watchedTitle = form.watch("title");
  const watchedImpactScope = form.watch("impactScope");

  // Auto-start IPFS storage when dialog opens
  useEffect(() => {
    if (open && !ipfsHash) {
      startIPFSStorage();
    }
  }, [open]);

  const startIPFSStorage = async () => {
    try {
      setMintingState("storing-ipfs");
      setIpfsProgress("Uploading to IPFS...");

      const result = await uploadToIPFS(logicModel);
      setIpfsHash(result.hash);
      setIpfsProgress("Stored on IPFS");
      setCurrentStep(2); // Move to next step once IPFS is complete

      // Generate logic model image for preview
      const imageDataUrl = await generateLogicModelImage();
      if (imageDataUrl) {
        setHypercertImage(imageDataUrl);
      }

      setMintingState("idle"); // Reset to idle so user can mint

      // Copy the URL to clipboard
      const url = `${window.location.origin}/canvas/${result.hash}`;
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("IPFS storage failed:", error);
      setError("Failed to store on IPFS. Please try again.");
      setMintingState("error");
    }
  };

  const generateLogicModelImage = async () => {
    try {
      const canvasElement =
        document.querySelector('[data-testid="canvas-container"]') ||
        document.querySelector(".flex-1.relative.overflow-hidden") ||
        document.querySelector('[ref="canvasRef"]');

      if (canvasElement) {
        const logicModelDataUrl = await toPng(canvasElement as HTMLElement, {
          quality: 0.95,
          width: 1200,
          height: 600,
          backgroundColor: "#ffffff",
        });

        return logicModelDataUrl;
      }
    } catch (error) {
      console.warn("Failed to generate canvas image:", error);
    }
    return "";
  };

  const onSubmit = async (data: FormData) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet");
      return;
    }

    if (!ipfsHash) {
      setError("Logic model must be stored on IPFS first");
      return;
    }

    try {
      setMintingState("generating-image");
      setError("");

      // Generate logic model image
      const imageDataUrl = await generateLogicModelImage();
      setHypercertImage(imageDataUrl);

      // Start minting
      setMintingState("minting");

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum!),
        account: address,
      });

      const client = new HypercertClient({
        environment: "test",
        walletClient,
      });

      const now = Math.floor(Date.now() / 1000);
      const oneYearFromNow = now + 365 * 24 * 60 * 60;

      const {
        data: metadata,
        valid,
        errors,
      } = formatHypercertData({
        name: data.title,
        description: data.description,
        external_url: `${window.location.origin}/canvas/${ipfsHash}`,
        image: imageDataUrl,
        version: "1.0.0",
        workScope: ["Logic Model Implementation"],
        impactScope: [data.impactScope],
        workTimeframeStart: now,
        workTimeframeEnd: now,
        impactTimeframeStart: now,
        impactTimeframeEnd: oneYearFromNow,
        contributors: [address],
        rights: ["Public Display", "Impact Attribution"],
        excludedWorkScope: [],
        excludedImpactScope: [],
        excludedRights: [],
      });

      if (!valid || !metadata) {
        const errorMessage =
          errors && Array.isArray(errors)
            ? errors.join(", ")
            : "Unknown validation error";
        throw new Error(`Invalid metadata: ${errorMessage}`);
      }

      const txHash = await client.mintHypercert({
        metaData: metadata,
        totalUnits: BigInt(100000000),
        transferRestriction: TransferRestrictions.AllowAll,
      });

      // Step 3: Success
      setCurrentStep(3);
      setMintingState("success");
      setResult({ txHash });
    } catch (err) {
      console.error("Minting failed:", err);
      setError(err instanceof Error ? err.message : "Minting failed");
      setMintingState("error");
    }
  };

  const handleViewOnTestnet = () => {
    if (result?.txHash) {
      const testnetUrl = `https://testnet.hypercerts.org/app/view/${result.txHash}`;
      window.open(testnetUrl, "_blank");
    }
  };

  const resetDialog = () => {
    setCurrentStep(1);
    setMintingState("idle");
    setResult(null);
    setError("");
    setHypercertImage("");
    setIpfsHash(undefined);
    setIpfsProgress("Preparing...");
    form.reset();
    onOpenChange(false);
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > step.id
                  ? "bg-green-500 text-white"
                  : currentStep === step.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
            </div>
            <div className="mt-2 text-center">
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-xs text-muted-foreground">
                {step.description}
              </div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-4 ${
                currentStep > step.id ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-scroll">
        <AlertDialogHeader>
          <AlertDialogTitle>Mint Hypercert</AlertDialogTitle>
          <AlertDialogDescription>
            Create a hypercert for your logic model to track and verify impact.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <StepIndicator />

        <div className="grid grid-cols-1 gap-6">
          {/* Left side - Form */}
          <div className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter hypercert title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the impact and work represented by this hypercert"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impactScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact Scope *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Education, Healthcare, Climate Change"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Define the area of impact for this hypercert
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {logicModel && (
                  <div className="text-sm text-muted-foreground">
                    <p>Logic Model Details:</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">
                        {logicModel.cards?.length || 0} evidence cards
                      </Badge>
                      {ipfsHash && (
                        <Badge variant="outline">Stored on IPFS</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading States */}
                {mintingState === "generating-image" && (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Generating hypercert image...
                    </p>
                  </div>
                )}

                {mintingState === "minting" && (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Minting hypercert...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please confirm the transaction in your wallet
                    </p>
                  </div>
                )}

                {mintingState === "success" && (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      Hypercert Minted Successfully!
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Your logic model has been converted into a hypercert on
                      Base Sepolia testnet.
                    </p>

                    {result && (
                      <div className="text-sm text-muted-foreground space-y-1 text-center">
                        <p>
                          <strong>Units:</strong> 100,000,000
                        </p>
                        <p>
                          <strong>Transaction:</strong>{" "}
                          {result.txHash.slice(0, 10)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {!isConnected && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                    Please connect your wallet to mint a hypercert
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Right side - Hypercert Card Preview */}
          <div className="space-y-4">
            <HypercertCard
              title={watchedTitle || "Your title here"}
              banner={hypercertImage || undefined}
              workStartDate={new Date()}
              workEndDate={new Date()}
              badges={[
                "Logic Model",
                watchedImpactScope || "Impact Scope",
                "Evidence-Based",
                `${logicModel.cards?.length || 0} Cards`,
              ].filter(Boolean)}
            />

            <p className="text-xs text-muted-foreground text-center">
              Live preview of your hypercert
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          {mintingState === "idle" ||
          mintingState === "error" ||
          mintingState === "storing-ipfs" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  !isConnected || !ipfsHash || mintingState === "storing-ipfs"
                }
              >
                {mintingState === "storing-ipfs" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Storing on IPFS...
                  </>
                ) : (
                  "Start Minting"
                )}
              </Button>
            </>
          ) : mintingState === "generating-image" ||
            mintingState === "minting" ? (
            <Button disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </Button>
          ) : mintingState === "success" ? (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Close
              </Button>
              <Button onClick={handleViewOnTestnet}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Testnet
              </Button>
            </>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
