export type DzpnTableRow = {
  teamName: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type DzpnClient = {
  fetchLeagueTable: (competition: string, season: string) => Promise<DzpnTableRow[]>;
  isApiAvailable: () => boolean;
};

export const dzpnClient: DzpnClient = {
  isApiAvailable() {
    return Boolean(process.env.DZPN_API_URL && process.env.DZPN_API_KEY);
  },
  async fetchLeagueTable(_competition: string, _season: string) {
    if (!dzpnClient.isApiAvailable()) {
      throw new Error("DZPN: brak skonfigurowanego API — synchronizacja ze stagingu/importu.");
    }
    throw new Error("DZPN API adapter not configured");
  },
};
