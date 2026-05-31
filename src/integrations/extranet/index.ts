export type ExtranetMatchReport = {
  externalMatchId: string;
  homeScore: number;
  awayScore: number;
  events: Array<{ type: string; minute: number; playerName: string }>;
};

export type ExtranetClient = {
  pushMatchReport: (report: ExtranetMatchReport) => Promise<void>;
};

export const extranetClient: ExtranetClient = {
  async pushMatchReport(_report: ExtranetMatchReport) {
    throw new Error("Extranet integration not implemented");
  },
};
