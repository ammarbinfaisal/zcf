import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

export const runtime = "edge";

export const alt = site.name;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "stretch",
          padding: 64,
          backgroundColor: "#faf3e0",
          backgroundImage: "linear-gradient(135deg, #0ea5e9 0%, #1f2937 100%)",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 32,
            padding: 56,
            backgroundColor: "rgba(250, 243, 224, 0.92)",
            border: "2px solid rgba(14, 165, 233, 0.22)",
            boxShadow: "0 24px 80px rgba(31, 41, 55, 0.28)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 74,
                fontWeight: 800,
                letterSpacing: -1.2,
                color: "#1f2937",
                lineHeight: 1.05,
              }}
            >
              {site.name}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "rgba(31, 41, 55, 0.74)",
                lineHeight: 1.3,
                maxWidth: 860,
              }}
            >
              {site.tagline}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              paddingTop: 28,
              borderTop: "1px solid rgba(31, 41, 55, 0.14)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundImage: "linear-gradient(135deg, #0ea5e9, #1f2937)",
                  boxShadow: "0 10px 30px rgba(14, 165, 233, 0.20)",
                }}
              />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(31, 41, 55, 0.85)",
                }}
              >
                {site.shortName}
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(31, 41, 55, 0.62)",
              }}
            >
              {site.domain}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

