/**
 * Canvas 2D API utility for composing exported canvas images with MUSE branding
 */

export interface CanvasImageOptions {
  /** Source image data URL from html-to-image */
  sourceDataUrl: string;
}

export interface CanvasImageResult {
  /** Data URL for download */
  dataUrl: string;
  /** Blob for clipboard API */
  blob: Blob;
}

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

const EXPORT_HEADER_HEIGHT = 80;
const EXPORT_FOOTER_HEIGHT = 60;
const EXPORT_PADDING_X = 64;

/**
 * Compose an export image by adding MUSE credit bands above and below the
 * captured canvas. The source image is drawn at 100% of its original size —
 * no scaling — so the logic model itself never shrinks. The output is just
 * taller by HEADER + FOOTER.
 */
export async function composeExportImage({
  sourceDataUrl,
}: CanvasImageOptions): Promise<CanvasImageResult> {
  const sourceImg = await loadImage(sourceDataUrl);

  const outputWidth = sourceImg.width;
  const outputHeight = EXPORT_HEADER_HEIGHT + sourceImg.height + EXPORT_FOOTER_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#1e293b";
  const museWidth = ctx.measureText("MUSE").width;
  ctx.fillText("MUSE", EXPORT_PADDING_X, EXPORT_HEADER_HEIGHT / 2);

  ctx.font = "22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("by Beaconlabs", EXPORT_PADDING_X + museWidth + 14, EXPORT_HEADER_HEIGHT / 2 + 3);

  ctx.drawImage(sourceImg, 0, EXPORT_HEADER_HEIGHT, sourceImg.width, sourceImg.height);

  ctx.font = "20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "right";
  ctx.fillText(
    "musecanvas.app",
    outputWidth - EXPORT_PADDING_X,
    EXPORT_HEADER_HEIGHT + sourceImg.height + EXPORT_FOOTER_HEIGHT / 2,
  );

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
