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
          backgroundImage: "linear-gradient(135deg, #0f766e 0%, #f59e0b 100%)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: "#071316",
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
