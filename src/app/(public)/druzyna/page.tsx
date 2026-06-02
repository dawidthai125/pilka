import type { Metadata } from "next";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicPlayers } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Drużyna", "/druzyna");
}

export default async function TeamPublicPage() {
  const players = await getPublicPlayers();

  return (
    <PublicPageShell title="Kadra drużyny" subtitle="Zawodnicy, pozycje, numery i statystyki sezonu.">
      <div className="overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Zawodnik</th>
              <th className="px-4 py-3">Pozycja</th>
              <th className="px-4 py-3">M</th>
              <th className="px-4 py-3">G</th>
              <th className="px-4 py-3">A</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-semibold">{p.jerseyNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-4 py-3 capitalize">{p.position ?? "—"}</td>
                <td className="px-4 py-3">{p.matchesPlayed}</td>
                <td className="px-4 py-3">{p.goals}</td>
                <td className="px-4 py-3">{p.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PublicPageShell>
  );
}
