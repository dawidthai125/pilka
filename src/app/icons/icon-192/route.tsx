import { ImageResponse } from "next/og";

export const runtime = "edge";

function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B3D2E",
        }}
      >
        <div
          style={{
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: "50%",
            border: `${Math.max(4, size * 0.04)}px solid #F4C430`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: size * 0.28,
            fontWeight: 700,
          }}
        >
          +
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}

export async function GET() {
  return renderIcon(192);
}
