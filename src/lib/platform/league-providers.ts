import type { LeagueSourceAdapter } from "@/types/league";

export type LeagueProviderId = "mirror_live" | "manual_import";

export type LeagueProviderField = {
  key: string;
  label: string;
  required: boolean;
  type: "text" | "url" | "password" | "uuid";
  placeholder?: string;
  help?: string;
  /** technical = stored in config JSON, not shown as raw JSON to operator */
  visibility: "operator" | "technical";
};

export type LeagueProviderDefinition = {
  id: LeagueProviderId;
  label: string;
  description: string;
  adapter: LeagueSourceAdapter;
  sourceName: string;
  providerLabel: string;
  fields: LeagueProviderField[];
};

export const LEAGUE_PROVIDERS: LeagueProviderDefinition[] = [
  {
    id: "mirror_live",
    label: "Mirror live (90minut + regionalnyfutbol)",
    description:
      "Automatyczny import tabeli, terminarza i kadry z publicznych źródeł. Opcjonalnie statystyki mPZPN (ŁNP) z tokenem Bearer.",
    adapter: "json",
    sourceName: "Mirror live — 90minut + regionalnyfutbol",
    providerLabel: "Mirror (mPZPN/ŁNP)",
    fields: [
      {
        key: "ninetyMinutUrl",
        label: "URL tabeli 90minut.pl",
        required: true,
        type: "url",
        placeholder: "http://www.90minut.pl/liga/1/liga14526.html",
        help: "Strona ligi na 90minut.pl z tabelą i terminarzem.",
        visibility: "operator",
      },
      {
        key: "regionalnyFutbolUrl",
        label: "URL regionalnyfutbol.pl",
        required: true,
        type: "url",
        placeholder: "https://regionalnyfutbol.pl/liga,...",
        help: "Alternatywne źródło terminarza i wyników.",
        visibility: "operator",
      },
      {
        key: "regiowynikiKadraUrl",
        label: "URL kadry regiowyniki.pl (opcjonalnie)",
        required: false,
        type: "url",
        placeholder: "https://regiowyniki.pl/druzyna/.../kadra/",
        help: "Jeśli puste — generowane z nazwy drużyny ligowej.",
        visibility: "operator",
      },
      {
        key: "ownLeagueName",
        label: "Nazwa drużyny w lidze",
        required: true,
        type: "text",
        placeholder: "GLKS Mietków",
        help: "Dokładna nazwa w tabeli ligowej (do mapowania wyników).",
        visibility: "operator",
      },
      {
        key: "ownDisplayName",
        label: "Nazwa wyświetlana w FC OS",
        required: true,
        type: "text",
        placeholder: "Piorun Wawrzeńczyce",
        visibility: "operator",
      },
      {
        key: "lnpAccessToken",
        label: "Token mPZPN / ŁNP (Bearer)",
        required: false,
        type: "password",
        help: "Opcjonalnie — statystyki zawodników (M/G/ŻK). Skopiuj z DevTools na laczynaspilka.pl.",
        visibility: "operator",
      },
      {
        key: "lnpTeamId",
        label: "UUID drużyny mPZPN",
        required: false,
        type: "uuid",
        placeholder: "312e40bc-a65a-4558-ad00-d1edccc66e60",
        visibility: "operator",
      },
      {
        key: "lnpSeasonId",
        label: "UUID sezonu mPZPN (opcjonalnie)",
        required: false,
        type: "uuid",
        visibility: "technical",
      },
      {
        key: "lnpLeagueId",
        label: "UUID ligi mPZPN (opcjonalnie)",
        required: false,
        type: "uuid",
        visibility: "technical",
      },
    ],
  },
  {
    id: "manual_import",
    label: "Import ręczny (CSV / JSON)",
    description:
      "Operator klubu importuje pliki w panelu Liga → Import. Brak automatycznego pobierania z internetu.",
    adapter: "csv",
    sourceName: "Import ręczny",
    providerLabel: "DZPN / ręczny",
    fields: [
      {
        key: "manualAdapter",
        label: "Format pliku",
        required: true,
        type: "text",
        placeholder: "csv lub json",
        visibility: "operator",
      },
    ],
  },
];

export function getLeagueProvider(id: LeagueProviderId): LeagueProviderDefinition {
  const provider = LEAGUE_PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new Error(`Unknown league provider: ${id}`);
  return provider;
}

export function buildRegiowynikiKadraUrl(leagueTeamName: string): string | null {
  const slug = leagueTeamName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
  if (!slug) return null;
  return `https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/${slug}/kadra/`;
}
