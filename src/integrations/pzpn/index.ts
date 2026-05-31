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
  fetchFixtures: (season: string) => Promise<PzpnFixture[]>;
};

export const pzpnClient: PzpnClient = {
  async fetchFixtures(_season: string) {
    throw new Error("PZPN integration not implemented");
  },
};
