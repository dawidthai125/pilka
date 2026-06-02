"use client";

import { SPONSOR_PUBLICATION_SOURCE_LABELS } from "@/lib/sponsors/constants";
import type { SponsorPublication } from "@/types/sponsors";

export function SponsorPublicationsList({
  publications,
}: {
  publications: SponsorPublication[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {publications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Brak publikacji.</p>
      ) : (
        <ul className="divide-y">
          {publications.map((pub) => (
            <li key={pub.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between">
              <div>
                <p className="font-medium">{pub.title}</p>
                <p className="text-sm text-muted-foreground">
                  {pub.publishedAt} · {SPONSOR_PUBLICATION_SOURCE_LABELS[pub.source]}
                </p>
                {pub.description ? <p className="mt-1 text-sm">{pub.description}</p> : null}
                {pub.sponsorNames?.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sponsorzy: {pub.sponsorNames.join(", ")}
                  </p>
                ) : null}
              </div>
              {pub.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pub.imageUrl} alt="" className="h-20 w-32 rounded object-cover" />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
