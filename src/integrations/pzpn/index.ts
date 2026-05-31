export type PzpnFixture = {
  externalId: string;
  competition: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchTime: string;
};

export type PzpnClient = {
  /** Brak publicznego API — adapter gotowy pod przyszłe podłączenie. */
  fetchFixtures: (season: string) => Promise<PzpnFixture[]>;
  isApiAvailable: () => boolean;
};

export const pzpnClient: PzpnClient = {
  isApiAvailable() {
    return Boolean(process.env.PZPN_API_URL && process.env.PZPN_API_KEY);
  },
  async fetchFixtures(_season: string) {
    if (!pzpnClient.isApiAvailable()) {
      throw new Error("PZPN: brak publicznego API — użyj importu CSV/JSON lub stagingu w bazie.");
    }
    throw new Error("PZPN API adapter not configured");
  },
};
