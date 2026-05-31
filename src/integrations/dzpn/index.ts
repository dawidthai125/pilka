export type DzpnTableRow = {
  teamName: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type DzpnClient = {
  fetchLeagueTable: (competition: string, season: string) => Promise<DzpnTableRow[]>;
};

export const dzpnClient: DzpnClient = {
  async fetchLeagueTable(_competition: string, _season: string) {
    throw new Error("DZPN integration not implemented");
  },
};
