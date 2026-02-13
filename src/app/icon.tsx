import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg, #0ea5e9 0%, #1f2937 100%)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: "#faf3e0",
            letterSpacing: -0.3,
          }}
        >
          {site.shortName.slice(0, 1)}
        </div>
      </div>
    ),
    size,
  );
}
