import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
            width: 266,
            height: 266,
            borderRadius: "50%",
            border: "20px solid #F4C430",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontSize: 140,
            fontWeight: 700,
          }}
        >
          PW
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
