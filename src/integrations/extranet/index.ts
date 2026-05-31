export type ExtranetMatchReport = {
  externalMatchId: string;
  homeScore: number;
  awayScore: number;
  events: Array<{ type: string; minute: number; playerName: string }>;
};

export type ExtranetClient = {
  pushMatchReport: (report: ExtranetMatchReport) => Promise<void>;
  isApiAvailable: () => boolean;
};

export const extranetClient: ExtranetClient = {
  isApiAvailable() {
    return Boolean(process.env.EXTRANET_API_URL && process.env.EXTRANET_API_KEY);
  },
  async pushMatchReport(_report: ExtranetMatchReport) {
    if (!extranetClient.isApiAvailable()) {
      throw new Error("Extranet: brak skonfigurowanego API — raporty można eksportować ręcznie.");
    }
    throw new Error("Extranet API adapter not configured");
  },
};
