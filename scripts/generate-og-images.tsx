/**
 * Build-time generator for the evidence OG images (#306).
 *
 * Renders one 1200×630 PNG per evidence slug into public/og/evidence/ so the
 * Workers runtime never runs satori/resvg — the per-request render exceeded
 * the Workers Free plan's 10 ms CPU budget. Run by the `generate:og` package
 * script, chained ahead of `next build` in `build`. `build:worker` gets it for
 * free: `opennextjs-cloudflare build` shells out to the package `build` script.
 *
 * Evidence data comes from @beaconlabs-io/evidence/content directly, not
 * lib/evidence, which would drag the MDX compile pipeline into this script.
 */
import { ImageResponse } from "next/og";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllEvidenceSlugs, getEvidence } from "@beaconlabs-io/evidence/content";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "public", "og", "evidence");

const logo = readFileSync(join(ROOT, "public", "beaconlabs.png"));
// Sniff the real format: the file is a JPEG despite its .png extension, and
// satori silently drops an <img> whose data URI declares the wrong MIME type.
// Any other format (a WebP re-export, say) must fail loudly here — a wrong
// MIME would ship every OG image logo-less with a green build.
function sniffLogoMime(bytes: Buffer): string {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return "image/png";
  throw new Error("public/beaconlabs.png is neither JPEG nor PNG; satori would drop the logo");
}
const logoMime = sniffLogoMime(logo);
const logoUrl = `data:${logoMime};base64,${logo.toString("base64")}`;

function ogTemplate(meta: { title: string; author: string }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        backgroundColor: "white",
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          opacity: 0.05,
        }}
      />

      {/* Border */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          border: "3px solid #e2e8f0",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      />

      {/* Content Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Main Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "800",
            color: "#0f172a",
            lineHeight: "1.1",
            marginBottom: "auto",
            maxWidth: "1000px",
            display: "flex",
          }}
        >
          {meta.title}
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: "auto",
          }}
        >
          {/* Left: Author */}
          <div
            style={{
              fontSize: "32px",
              color: "#1e293b",
              fontWeight: "600",
              display: "flex",
            }}
          >
            {meta.author}
          </div>

          {/* Right: MUSE Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori requires native <img> */}
            <img
              src={logoUrl}
              alt="Beacon Labs Logo"
              width={60}
              height={60}
              style={{
                borderRadius: "12px",
                marginRight: "20px",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1e293b",
                  lineHeight: "1",
                  display: "flex",
                }}
              >
                MUSE
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  lineHeight: "1",
                  marginTop: "2px",
                  display: "flex",
                }}
              >
                by Beaconlabs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function renderOne(slug: string): Promise<void> {
  const bundled = getEvidence(slug);
  if (!bundled) throw new Error("no bundled evidence");

  const meta = bundled.frontmatter as { title: string; author: string };
  // No status check: ImageResponse is always 200 unless an explicit `status`
  // option is passed; render failures reject from arrayBuffer() below.
  const response = new ImageResponse(ogTemplate(meta), { width: 1200, height: 630 });
  const png = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(OUT_DIR, `${slug}.png`), png);
}

const slugs = getAllEvidenceSlugs();
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const failures: string[] = [];
for (const slug of slugs) {
  try {
    await renderOne(slug);
  } catch (error) {
    failures.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// A silent shortfall would ship pages referencing 404 images, so any gap
// fails the build.
const written = readdirSync(OUT_DIR).filter((f) => f.endsWith(".png")).length;
if (failures.length > 0 || written !== slugs.length) {
  console.error(`OG generation failed: wrote ${written}/${slugs.length} images.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Generated ${written} evidence OG images in public/og/evidence`);
