import { ImageResponse } from "next/og";
import { getCanvasMetadata } from "@/lib/canvas-metadata";
import { BASE_URL } from "@/lib/constants";
import { isValidCID } from "@/utils/ipfs";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("id parameter required", { status: 400 });
    }

    if (!isValidCID(id)) {
      return new Response("Invalid IPFS CID", { status: 400 });
    }

    // Fetch canvas metadata using shared utility
    const { title, cardCount } = await getCanvasMetadata(id);

    const logoUrl = `${BASE_URL}/beaconlabs.png`;
    const shortHash = `${id.slice(0, 8)}...${id.slice(-4)}`;

    return new ImageResponse(
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
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "18px",
                fontWeight: "600",
                display: "flex",
              }}
            >
              Logic Model
            </div>
            {cardCount > 0 && (
              <div
                style={{
                  marginLeft: "12px",
                  color: "#64748b",
                  fontSize: "18px",
                  display: "flex",
                }}
              >
                {cardCount} cards
              </div>
            )}
          </div>

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
            {title}
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
            {/* Left: IPFS Hash */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                  display: "flex",
                }}
              >
                IPFS
              </div>
              <div
                style={{
                  fontSize: "20px",
                  color: "#475569",
                  fontFamily: "monospace",
                  display: "flex",
                }}
              >
                {shortHash}
              </div>
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
      </div>,
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
