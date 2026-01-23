/**
 * Canvas 2D API utility for generating branded images
 * Creates OGP-optimized images (1200×630) with MUSE branding
 */

export interface BrandedImageOptions {
  /** Source image data URL from html-to-image */
  sourceDataUrl: string;
}

export interface BrandedImageResult {
  /** Data URL for download */
  dataUrl: string;
  /** Blob for clipboard API */
  blob: Blob;
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const PADDING = 24;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 40;

const IMAGE_LOAD_TIMEOUT_MS = 10000;

/**
 * Load an image from a data URL with timeout
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      reject(new Error("Image load timed out"));
    }, IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };
    img.onerror = (e) => {
      clearTimeout(timeoutId);
      reject(new Error(`Image load failed: ${e}`));
    };
    img.src = dataUrl;
  });
}

/**
 * Generate a branded image with MUSE branding overlay
 *
 * Layout (1200×630):
 * ┌─────────────────────────────────────────────┐
 * │          MUSE by Beaconlabs                 │  ← Header (centered)
 * │                                             │
 * │         ┌─────────────────────┐            │
 * │         │   Logic Model       │            │  ← Main image (centered, max 90%)
 * │         │   Canvas Image      │            │
 * │         └─────────────────────┘            │
 * │                                             │
 * │            muse.beaconlabs.io              │  ← Footer
 * └─────────────────────────────────────────────┘
 */
export async function generateBrandedImage({
  sourceDataUrl,
}: BrandedImageOptions): Promise<BrandedImageResult> {
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = OG_WIDTH;
  canvas.height = OG_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Fill background with light gray
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // Draw subtle gradient background
  const gradient = ctx.createLinearGradient(0, 0, OG_WIDTH, OG_HEIGHT);
  gradient.addColorStop(0, "rgba(102, 126, 234, 0.05)");
  gradient.addColorStop(1, "rgba(118, 75, 162, 0.05)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // Draw header - centered "MUSE by Beaconlabs"
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Measure combined width to position correctly
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  const museWidth = ctx.measureText("MUSE").width;
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  const byTextWidth = ctx.measureText("by Beaconlabs").width;
  const totalWidth = museWidth + 12 + byTextWidth;
  const startX = (OG_WIDTH - totalWidth) / 2;

  // Draw MUSE
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "left";
  ctx.fillText("MUSE", startX, HEADER_HEIGHT / 2 + PADDING);

  // Draw "by Beaconlabs"
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("by Beaconlabs", startX + museWidth + 12, HEADER_HEIGHT / 2 + PADDING + 4);

  // Load and draw the source image
  const sourceImg = await loadImage(sourceDataUrl);

  // Calculate available area for the canvas image
  const availableWidth = OG_WIDTH - PADDING * 2;
  const availableHeight = OG_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - PADDING * 2;

  // Calculate scaled dimensions to fit while maintaining aspect ratio
  const scale = Math.min(
    (availableWidth * 0.9) / sourceImg.width,
    (availableHeight * 0.9) / sourceImg.height,
    1, // Don't upscale
  );

  const scaledWidth = sourceImg.width * scale;
  const scaledHeight = sourceImg.height * scale;

  // Center the image in the available area
  const x = (OG_WIDTH - scaledWidth) / 2;
  const y = HEADER_HEIGHT + PADDING + (availableHeight - scaledHeight) / 2;

  // Draw border/shadow around image area
  ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 8, y - 8, scaledWidth + 16, scaledHeight + 16);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw the canvas image
  ctx.drawImage(sourceImg, x, y, scaledWidth, scaledHeight);

  // Draw footer URL
  ctx.font = "16px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.fillText("muse.beaconlabs.io", OG_WIDTH / 2, OG_HEIGHT - FOOTER_HEIGHT / 2);
  ctx.textAlign = "left";

  // Convert to data URL and blob
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Failed to convert canvas to blob"));
    }, "image/png");
  });

  return { dataUrl, blob };
}

/**
 * Copy image blob to clipboard using Clipboard API
 * Falls back with error message for unsupported browsers
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    // Check if ClipboardItem is supported
    if (typeof ClipboardItem === "undefined") {
      return false;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
    return true;
  } catch {
    // Safari/Firefox may not support image clipboard
    return false;
  }
}

/**
 * Trigger download of image from data URL
 */
export function downloadImage(dataUrl: string, filename?: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || `logic-model-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
