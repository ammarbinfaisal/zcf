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
          justifyContent: "flex-start",
          padding: 64,
          backgroundColor: "#f5f7fa",
          backgroundImage: "linear-gradient(135deg, #0f766e 0%, #f59e0b 100%)",
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
            backgroundColor: "rgba(245, 247, 250, 0.92)",
            border: "2px solid rgba(15, 118, 110, 0.25)",
            boxShadow: "0 24px 80px rgba(11, 18, 32, 0.22)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 74,
                fontWeight: 800,
                letterSpacing: -1.2,
                color: "#0b1220",
                lineHeight: 1.05,
              }}
            >
              {site.name}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "rgba(11, 18, 32, 0.72)",
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
              borderTop: "1px solid rgba(15, 118, 110, 0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundImage: "linear-gradient(135deg, #0f766e, #f59e0b)",
                  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.22)",
                }}
              />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "rgba(11, 18, 32, 0.82)",
                }}
              >
                {site.shortName}
              </div>
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(11, 18, 32, 0.62)",
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
