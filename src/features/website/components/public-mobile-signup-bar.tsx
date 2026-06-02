"use client";

import Link from "next/link";
import { Phone } from "lucide-react";

export function PublicMobileSignupBar({
  phone,
  label = "Zapisz dziecko",
}: {
  phone?: string | null;
  label?: string;
}) {
  if (!phone) return null;

  const telHref = `tel:${phone.replace(/\s/g, "")}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#062820]/95 px-4 py-3 backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Link
          href="/#akademia"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)]"
        >
          {label}
        </Link>
        <a
          href={telHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-semibold text-white"
        >
          <Phone className="size-4 text-[var(--club-secondary)]" />
          <span className="tabular-nums">{phone}</span>
        </a>
      </div>
    </div>
  );
}
