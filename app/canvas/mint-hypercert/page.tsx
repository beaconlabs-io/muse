"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HypercertClient, formatHypercertData, TransferRestrictions } from "@hypercerts-org/sdk";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { ArrowLeft, Check, ExternalLink, Loader2, CalendarIcon, Trash2 } from "lucide-react";
import { baseSepolia } from "viem/chains";
import { useAccount, useWaitForTransactionReceipt, useWalletClient } from "wagmi";
import { z } from "zod";
import HypercertCard from "@/components/hypercerts/HypercertCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LogicModel } from "@/types";
import { generateHypercertIdFromReceipt } from "@/utils/generateHypercertIdFromReceipt";
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
  logoFile: z.any().optional(),
  bannerFile: z.any().optional(),
  workDates: z
    .tuple([z.date(), z.date()])
    .refine((dates) => dates[0] && dates[1], "Both start and end dates are required"),
  contributors: z.string().min(1, "Contributors field is required"),
});

type FormData = z.infer<typeof hypercertFormSchema>;

type MintingStep = 1 | 2 | 3;
type MintingState = "idle" | "storing-ipfs" | "generating-image" | "minting" | "success" | "error";

interface HypercertResult {
  txHash: string;
  hypercertId?: string;
  hypercertUrl?: string;
}

const steps = [
  { id: 1, title: "Store Logic Model", description: "Stored on IPFS" },
  { id: 2, title: "Mint Hypercert", description: "Creating hypercert" },
  { id: 3, title: "Completed!", description: "Successfully minted" },
];

// Helper function to get stored logic model
const getStoredLogicModel = (): LogicModel | null => {
  if (typeof window === "undefined") return null;
  const storedLogicModel = sessionStorage.getItem("currentLogicModel");
  if (storedLogicModel) {
    try {
      return JSON.parse(storedLogicModel);
    } catch (error) {
      console.error("Failed to parse stored logic model:", error);
      return null;
    }
  }
  return null;
};

export default function MintHypercertPage() {
  const router = useRouter();
  const storedLogicModel = getStoredLogicModel();

  const [logicModel] = useState<LogicModel | null>(storedLogicModel);
  const [hypercertImage, setHypercertImage] = useState<string>("");
  const [, setIpfsHash] = useState<string>("");
  const [showMintingDialog, setShowMintingDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<MintingStep>(1);
  const [mintingState, setMintingState] = useState<MintingState>("idle");
  const [result, setResult] = useState<HypercertResult | null>(null);
  const [error, setError] = useState<string>("");
  const [mintTxHash, setMintTxHash] = useState<string | undefined>();
  // Refs for file inputs
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const hypercertCardRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Wait for transaction receipt and construct hypercert URL
  const {
    data: receiptData,
    isLoading: isReceiptLoading,
    isSuccess: isReceiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash as `0x${string}`,
    query: {
      enabled: !!mintTxHash,
    },
  });

  // Function to construct hypercert URL
  const constructHypercertUrl = (hypercertId: string): string => {
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://app.hypercerts.org/hypercerts/"
        : "https://testnet.hypercerts.org/hypercerts/";
    return `${baseUrl}${hypercertId}`;
  };

  // Function to generate hypercert image from the HypercertCard component
  const generateHypercertImage = async (): Promise<string> => {
    try {
      if (hypercertCardRef.current) {
        const dataUrl = await toPng(hypercertCardRef.current, {
          quality: 0.95,
          width: 336,
          height: 420,
          backgroundColor: "#ffffff",
        });
        return dataUrl;
      }
    } catch (error) {
      console.warn("Failed to generate hypercert image:", error);
    }
    return "";
  };

  const form = useForm<FormData>({
    resolver: zodResolver(hypercertFormSchema),
    defaultValues: {
      title: storedLogicModel?.title || "Logic Model " + new Date().toLocaleDateString(),
      description: storedLogicModel?.description || "Logic model created with Muse",
      impactScope: "",
      workDates: [new Date(), new Date()],
      contributors: "",
    },
  });

  const watchedTitle = form.watch("title");
  const watchedImpactScope = form.watch("impactScope");
  const watchedWorkDates = form.watch("workDates");
  const watchedContributors = form.watch("contributors");
  const watchedLogoFile = form.watch("logoFile");
  const watchedBannerFile = form.watch("bannerFile");

  // Generate preview URLs for files
  const logoPreviewUrl = watchedLogoFile ? URL.createObjectURL(watchedLogoFile) : null;
  const bannerPreviewUrl = watchedBannerFile ? URL.createObjectURL(watchedBannerFile) : null;

  // Redirect to canvas if no logic model is found
  useEffect(() => {
    if (!logicModel) {
      router.push("/canvas");
    }
  }, [logicModel, router]);

  // Handle receipt data and construct hypercert URL
  useEffect(() => {
    if (isReceiptSuccess && receiptData) {
      const hypercertId = generateHypercertIdFromReceipt(receiptData, baseSepolia.id);
      const hypercertUrl = constructHypercertUrl(hypercertId);

      setResult((prev) =>
        prev
          ? {
              ...prev,
              hypercertId,
              hypercertUrl,
            }
          : null,
      );

      setCurrentStep(3);
      setMintingState("success");
    }
  }, [isReceiptSuccess, receiptData]);

  // File handling functions
  const clearLogoFile = () => {
    form.setValue("logoFile", undefined);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = "";
    }
  };

  const clearBannerFile = () => {
    form.setValue("bannerFile", undefined);
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet");
      return;
    }

    if (!logicModel) {
      setError("No logic model found");
      return;
    }

    setShowMintingDialog(true);

    try {
      // Step 1: Store on IPFS
      setCurrentStep(1);
      setMintingState("storing-ipfs");
      setError("");

      const ipfsResult = await uploadToIPFS(logicModel);
      setIpfsHash(ipfsResult.hash);

      // Step 2: Generate image and mint
      setCurrentStep(2);
      setMintingState("generating-image");

      // Generate hypercert image from the card
      const generatedImage = await generateHypercertImage();
      if (generatedImage) {
        setHypercertImage(generatedImage);
      }

      const imageToUse = generatedImage || hypercertImage;

      setMintingState("minting");

      if (!walletClient) {
        setError("Wallet client not available");
        return;
      }

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
        external_url: `https://muse.beaconlabs.io/canvas/${ipfsResult.hash}`,
        image: imageToUse,
        version: "1.0.0",
        workScope: ["Logic Model Implementation"],
        impactScope: [data.impactScope],
        workTimeframeStart: data.workDates?.[0]
          ? Math.floor(data.workDates[0].getTime() / 1000)
          : now,
        workTimeframeEnd: data.workDates?.[1]
          ? Math.floor(data.workDates[1].getTime() / 1000)
          : now,
        impactTimeframeStart: now,
        impactTimeframeEnd: oneYearFromNow,
        contributors: data.contributors
          ? data.contributors
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        rights: ["Public Display", "Impact Attribution"],
        excludedWorkScope: [],
        excludedImpactScope: [],
        excludedRights: [],
      });

      if (!valid || !metadata) {
        const errorMessage =
          errors && Array.isArray(errors) ? errors.join(", ") : "Unknown validation error";
        throw new Error(`Invalid metadata: ${errorMessage}`);
      }

      const txHash = await client.mintHypercert({
        metaData: metadata,
        totalUnits: BigInt(100000000),
        transferRestriction: TransferRestrictions.AllowAll,
      });

      // Set the transaction hash to wait for receipt
      setMintTxHash(txHash);
      setResult({ txHash });

      // The success state will be set in the useEffect when receipt is received
    } catch (err) {
      console.error("Minting failed:", err);
      setError(err instanceof Error ? err.message : "Minting failed");
      setMintingState("error");
    }
  };

  const handleViewOnTestnet = () => {
    if (result?.hypercertUrl) {
      router.push(result.hypercertUrl);
    }
  };

  const resetDialog = () => {
    setCurrentStep(1);
    setMintingState("idle");
    setResult(null);
    setError("");
    setHypercertImage("");
    setIpfsHash("");
    setMintTxHash(undefined);
    setShowMintingDialog(false);
  };

  const StepIndicator = () => (
    <div className="mb-6 flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                currentStep > step.id
                  ? "bg-green-500 text-white"
                  : currentStep === step.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
              }`}
            >
              {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
            </div>
            <div className="mt-2 text-center">
              <div className="text-sm font-medium">{step.title}</div>
              <div className="text-muted-foreground text-xs">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mx-4 h-0.5 flex-1 ${
                currentStep > step.id ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (!logicModel) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Canvas
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left side - Form */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          rows={4}
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

                {/* Logo Input */}
                <FormField
                  control={form.control}
                  name="logoFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            ref={logoFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                            }}
                            className={field.value ? "pr-8" : ""}
                          />
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                              onClick={clearLogoFile}
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Banner Input */}
                <FormField
                  control={form.control}
                  name="bannerFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Image</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="relative">
                            <Input
                              ref={bannerFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                field.onChange(file);
                              }}
                              className={field.value ? "pr-8" : ""}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                                onClick={clearBannerFile}
                              >
                                <Trash2 className="text-destructive h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Work Dates */}
                <FormField
                  control={form.control}
                  name="workDates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Timeline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.[0] && field.value?.[1] ? (
                                <>
                                  {format(field.value[0], "LLL dd, y")} -{" "}
                                  {format(field.value[1], "LLL dd, y")}
                                </>
                              ) : (
                                <span>Pick work date range</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            defaultMonth={field.value?.[0]}
                            selected={{
                              from: field.value?.[0],
                              to: field.value?.[1],
                            }}
                            onSelect={(range: any) => {
                              field.onChange([range?.from, range?.to]);
                            }}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contributors */}
                <FormField
                  control={form.control}
                  name="contributors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contributors</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List contributors (names, addresses, or pseudonyms) separated by commas"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Add contributor addresses, names or pseudonyms whose work is represented by
                        the hypercert
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isConnected && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-600">
                    Please connect your wallet to mint a hypercert
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isConnected || !form.formState.isValid}
                  size="lg"
                >
                  Create Hypercert
                </Button>
              </form>
            </Form>
          </div>

          {/* Right side - Preview */}
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Live Preview</h3>
              <div className="flex justify-center">
                <HypercertCard
                  ref={hypercertCardRef}
                  title={watchedTitle || "Your title here"}
                  banner={bannerPreviewUrl || "/canvas-og.svg"}
                  logo={logoPreviewUrl || "/beaconlabs01.jpg"}
                  workStartDate={watchedWorkDates?.[0] || new Date()}
                  workEndDate={watchedWorkDates?.[1] || new Date()}
                  badges={["Logic Model", watchedImpactScope].filter(Boolean)}
                  contributors={
                    watchedContributors
                      ?.split(",")
                      .map((c) => c.trim())
                      .filter(Boolean) || []
                  }
                />
              </div>
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Preview of your hypercert
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Minting Progress Dialog */}
      <Dialog open={showMintingDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creating Hypercert</DialogTitle>
            <DialogDescription>Please wait while we create your hypercert...</DialogDescription>
          </DialogHeader>

          <StepIndicator />

          {mintingState === "storing-ipfs" && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">Storing on IPFS...</p>
            </div>
          )}

          {mintingState === "generating-image" && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">Generating hypercert image...</p>
            </div>
          )}

          {mintingState === "minting" && (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="mb-2 h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">
                {isReceiptLoading ? "Waiting for confirmation..." : "Minting hypercert..."}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {isReceiptLoading
                  ? "Transaction submitted, waiting for confirmation"
                  : "Please confirm the transaction in your wallet"}
              </p>
            </div>
          )}

          {mintingState === "success" && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-semibold">Hypercert Minted Successfully!</h3>
            </div>
          )}

          {mintingState === "error" && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 max-h-32 w-full overflow-hidden overflow-y-auto rounded-md bg-red-50 p-3 text-sm break-all whitespace-pre-wrap text-red-600">
                {error}
              </div>
            </div>
          )}

          <DialogFooter>
            {mintingState === "success" ? (
              <>
                <Button variant="outline" onClick={resetDialog}>
                  Close
                </Button>
                <Button onClick={handleViewOnTestnet} disabled={!result?.hypercertUrl}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Hypercert
                </Button>
              </>
            ) : mintingState === "error" ? (
              <Button onClick={resetDialog}>Try Again</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
