import Link from "next/link";

import { ClubLogo } from "@/components/club/club-logo";
import { ClubThemeStyles } from "@/components/club/club-theme-styles";
import { formatProductAttribution, productConfig } from "@/config/product";
import { getAuthClubBranding } from "@/lib/club/branding-loader";

function LightningBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        viewBox="0 0 200 280"
        className="absolute left-1/2 top-8 size-[min(420px,90vw)] -translate-x-1/2 opacity-[0.12]"
        fill="none"
      >
        <path
          d="M110 8 L148 108 L198 108 L158 168 L178 268 L98 188 L38 268 L58 168 L18 108 L68 108 Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getAuthClubBranding();

  return (
    <>
      <ClubThemeStyles theme={branding.theme} />
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--club-primary,#0B3D2E)] px-4 py-10">
        <LightningBackdrop />

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center text-white">
            <ClubLogo logoUrl={branding.logoUrl} clubName={branding.clubName} size="xl" onDark className="mx-auto" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.15em] text-white/70">
              {productConfig.name}
            </p>
            <h1 className="mt-1 text-xl font-bold">Panel klubowy</h1>
            <p className="mt-1 text-sm text-white/75">{branding.panelTitle}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#041810]/80 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-white/50">
            <Link href="/" className="underline underline-offset-2 hover:text-white/80">
              Wróć na stronę klubu
            </Link>
          </p>
          <p className="mt-3 text-center text-[11px] text-white/40">{formatProductAttribution()}</p>
        </div>
      </div>
    </>
  );
}
