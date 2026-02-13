import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

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
          backgroundColor: "#0b0f14",
          backgroundImage: "linear-gradient(135deg, #0b0f14 0%, #334155 58%, #fbbf24 100%)",
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
            backgroundColor: "rgba(11, 15, 20, 0.86)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.45)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 74,
                fontWeight: 800,
                letterSpacing: -1.2,
                color: "#f8fafc",
                lineHeight: 1.05,
              }}
            >
              {site.name}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "rgba(248, 250, 252, 0.78)",
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
              borderTop: "1px solid rgba(248, 250, 252, 0.16)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundImage: "linear-gradient(135deg, #334155, #fbbf24)",
                  boxShadow: "0 10px 30px rgba(251, 191, 36, 0.15)",
                }}
              />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(248, 250, 252, 0.9)",
                }}
              >
                {site.shortName}
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(248, 250, 252, 0.68)",
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
