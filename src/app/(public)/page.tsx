import type { Metadata } from "next";
import Link from "next/link";

import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { listActivePublicClubs, clubPublicPath } from "@/lib/tenant/public-club";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kluby | FC OS",
  description: "Wybierz klub piłkarski — aktualności, mecze, tabela i kadra.",
};

export default async function PublicClubDirectoryPage() {
  const clubs = await listActivePublicClubs();

  if (clubs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#062820] p-6 text-center text-white">
        <p>Brak aktywnych klubów.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#062820] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold sm:text-4xl")}>Kluby piłkarskie</h1>
        <p className="mt-3 text-white/70">Wybierz klub, aby przejść na jego stronę publiczną.</p>
        <ul className="mt-10 space-y-3">
          {clubs.map((club) => (
            <li key={club.id}>
              <Link
                href={clubPublicPath(club.slug)}
                className="block rounded-xl border border-white/15 bg-white/5 px-5 py-4 transition hover:border-white/30 hover:bg-white/10"
              >
                <span className={cn(CLUB_DISPLAY_CLASS, "text-lg font-semibold")}>{club.publicName}</span>
                {club.officialName !== club.publicName ? (
                  <span className="mt-1 block text-sm text-white/55">{club.officialName}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
