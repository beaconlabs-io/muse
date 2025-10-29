"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatHypercertData, TransferRestrictions } from "@hypercerts-org/sdk";
import { track } from "@vercel/analytics";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { ArrowLeft, Loader2, CalendarIcon, Trash2 } from "lucide-react";
import { waitForTransactionReceipt } from "viem/actions";
import { useAccount, useWalletClient } from "wagmi";
import { z } from "zod";
import { createExtraContent } from "@/components/extra-content";
import HypercertCard from "@/components/hypercerts/HypercertCard";
import { useStepProcessDialogContext } from "@/components/step-process-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { StandardizedLogicModel } from "@/types";
import { generateHypercertIdFromReceipt } from "@/utils/generateHypercertIdFromReceipt";
import { getHypercertsClient } from "@/utils/hypercertsConfig";
import { uploadToIPFS } from "@/utils/ipfs";

// TODO: fix validation
// TODO: support markdown editor
// TODO: add hypercerts fields

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

// Helper function to get stored logic model
const getStoredLogicModel = (): StandardizedLogicModel | null => {
  if (typeof window === "undefined") return null;
  const storedLogicModel = sessionStorage.getItem("currentLogicModel");
  if (storedLogicModel) {
    try {
      return JSON.parse(storedLogicModel) as StandardizedLogicModel;
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

  const [logicModel] = useState<StandardizedLogicModel | null>(storedLogicModel);
  const [hypercertImage, setHypercertImage] = useState<string>(""); // Refs for file inputs
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const hypercertCardRef = useRef<HTMLDivElement>(null);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Step Process Dialog Context
  const { setSteps, setDialogStep, setOpen, setTitle, setExtraContent } =
    useStepProcessDialogContext();

  // Define steps for the minting process
  const mintingSteps = [
    { id: "upload-ipfs", description: "Uploading logic model to IPFS" },
    { id: "generate-image", description: "Generating hypercert image" },
    { id: "mint-hypercert", description: `Minting hypercert on ${chain?.name}` },
    { id: "confirming", description: "Waiting for on-chain confirmation" },
    { id: "done", description: "Minting complete!" },
  ];

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
      title: storedLogicModel?.metadata?.title || "Logic Model " + new Date().toLocaleDateString(),
      description: storedLogicModel?.metadata?.description || "Logic model created with Muse",
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
      console.error("Please connect your wallet");
      return;
    }

    if (!logicModel) {
      console.error("No logic model found");
      return;
    }

    if (!chain) {
      console.error("No chain found");
      return;
    }

    // Initialize step process dialog
    setSteps(mintingSteps);
    setTitle("Minting Hypercert");
    setOpen(true);

    let ipfsResult: any = null;
    let generatedImage: string = "";
    let currentStep = "upload-ipfs";

    try {
      // Step 1: Store on IPFS
      currentStep = "upload-ipfs";
      await setDialogStep("upload-ipfs", "active");

      ipfsResult = await uploadToIPFS(logicModel);
      await setDialogStep("upload-ipfs", "completed");

      // Step 2: Generate image
      currentStep = "generate-image";
      await setDialogStep("generate-image", "active");

      // Generate hypercert image from the card
      generatedImage = await generateHypercertImage();
      if (generatedImage) {
        setHypercertImage(generatedImage);
      }

      const imageToUse = generatedImage || hypercertImage;
      await setDialogStep("generate-image", "completed");

      // Step 3: Mint hypercert
      currentStep = "mint-hypercert";
      await setDialogStep("mint-hypercert", "active");

      if (!walletClient) {
        throw new Error("Wallet client not available");
      }

      const client = getHypercertsClient(walletClient);

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

      await setDialogStep("mint-hypercert", "completed");
      let receipt;
      await setDialogStep("confirming", "active");

      try {
        receipt = await waitForTransactionReceipt(walletClient!, {
          confirmations: 3,
          hash: txHash,
        });
        console.log({ receipt });
      } catch (error: unknown) {
        console.error("Error waiting for transaction receipt:", error);
        await setDialogStep(
          "confirming",
          "error",
          error instanceof Error ? error.message : "Unknown error",
        );
        throw new Error(
          `Failed to confirm transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      if (receipt?.status === "reverted") {
        throw new Error("Transaction reverted: Minting failed");
      }
      let hypercertId;
      try {
        hypercertId = generateHypercertIdFromReceipt(receipt, chain.id);
        console.log("Mint completed", {
          hypercertId: hypercertId || "not found",
        });
        track("Mint completed", {
          hypercertId: hypercertId || "not found",
        });
        console.log({ hypercertId });
      } catch (error) {
        console.error("Error generating hypercert ID:", error);
        await setDialogStep(
          "route",
          "error",
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      await setDialogStep("confirming", "completed");

      const extraContent = createExtraContent({
        receipt,
        hypercertId,
        chain: chain,
      });
      setExtraContent(extraContent);

      await setDialogStep("done", "completed");
    } catch (err) {
      console.error("Minting failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Minting failed";

      // Mark the current step as error
      await setDialogStep(currentStep, "error", errorMessage);
    }
  };

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
                  Mint Hypercert
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
                  logo={logoPreviewUrl || "/beaconlabs.png"}
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
    </div>
  );
}
