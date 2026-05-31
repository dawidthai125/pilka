"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SponsorStatusBadge } from "@/features/sponsors/components/sponsor-status-badge";
import type { Sponsor, SponsorCooperationStatus } from "@/types/sponsors";
import { Input } from "@/components/ui/input";

export function SponsorsList({ sponsors }: { sponsors: Sponsor[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SponsorCooperationStatus | "all">("all");

  const filtered = useMemo(() => {
    return sponsors.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.companyName.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || s.cooperationStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [sponsors, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Szukaj sponsora..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SponsorCooperationStatus | "all")}
          className="border-input bg-background min-h-[44px] h-11 rounded-md border px-3 text-sm shadow-xs sm:h-9"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywny</option>
          <option value="expiring">Wygasający</option>
          <option value="ended">Zakończony</option>
          <option value="potential">Potencjalny</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Brak sponsorów.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((sponsor) => (
              <li key={sponsor.id}>
                <Link
                  href={`/sponsors/${sponsor.id}`}
                  className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{sponsor.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {[sponsor.city, sponsor.contactEmail ?? sponsor.email]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <SponsorStatusBadge status={sponsor.cooperationStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
