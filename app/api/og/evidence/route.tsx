import { ImageResponse } from "next/og";
import { getEvidenceBySlug } from "@/lib/evidence";
import { baseUrl } from "@/utils/config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return new Response("Slug parameter required", { status: 400 });
    }

    const evidence = await getEvidenceBySlug(slug);

    if (!evidence) {
      return new Response("Evidence not found", { status: 404 });
    }

    const { meta } = evidence;

    const logoUrl = `${baseUrl}/beaconlabs.png`;

    return new ImageResponse(
      (
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
              zIndex: 1,
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
                <img
                  src={logoUrl}
                  alt="Beacon Labs Logo"
                  width="60"
                  height="60"
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
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("Failed to generate OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
