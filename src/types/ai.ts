export type AiMessageRole = "user" | "assistant" | "system";

export type AiReportCategory =
  | "matches"
  | "trainings"
  | "players"
  | "management"
  | "sponsors"
  | "finance"
  | "inventory"
  | "website"
  | "integrations"
  | "academy"
  | "scouting";

export type AiReportType =
  | "match_summary"
  | "training_weekly"
  | "management_monthly"
  | "social_facebook"
  | "social_instagram"
  | "social_website"
  | "social_round";

export type AiReportStatus = "draft" | "published" | "archived";

export type AiSuggestionType =
  | "low_attendance"
  | "missing_availability"
  | "expiring_documents"
  | "high_injuries";

export type AiSuggestionStatus = "open" | "dismissed" | "resolved";

export type AiConversation = {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  preview?: string | null;
};

export type AiMessage = {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
};

export type AiReport = {
  id: string;
  clubId: string;
  category: AiReportCategory;
  reportType: AiReportType;
  title: string;
  content: string;
  status: AiReportStatus;
  metadata: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiReportCategoryRow = {
  id: AiReportCategory;
  label: string;
  sortOrder: number;
};

export type AiSuggestion = {
  id: string;
  clubId: string;
  suggestionType: AiSuggestionType;
  title: string;
  description: string;
  actionHint: string | null;
  metadata: Record<string, unknown>;
  status: AiSuggestionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AiClubContext = {
  clubName: string;
  generatedAt: string;
  players: {
    total: number;
    injured: number;
    suspended: number;
    expiringDocuments: number;
    topScorers: Array<{ name: string; goals: number }>;
    lowestAttendance: Array<{ name: string; rate: number }>;
  };
  trainings: {
    thisWeekCount: number;
    avgAttendanceRate: number;
    missingAvailabilityCount: number;
  };
  matches: {
    completedCount: number;
    teamFormLast5: string;
    lastMatch: {
      home: string;
      away: string;
      score: string;
      date: string;
    } | null;
  };
  sponsors: {
    totalSponsors: number;
    activeContracts: number;
    activeContractValue: number;
    expiringWithin60Days: Array<{ companyName: string; contractName: string; endDate: string }>;
    noContact30Days: Array<{ companyName: string; lastContact: string | null }>;
  };
  finance: {
    summary: {
      totalIncome: number;
      totalExpenses: number;
      balance: number;
      overdueFeesCount: number;
    };
    overduePlayerFees: Array<{
      name: string;
      player: string | null;
      amountDue: number;
      amountPaid: number;
      status: string;
      dueDate: string;
    }>;
    unpaidSponsorEntries: Array<{
      amount: number;
      status: string;
      dueDate: string | null;
      sponsor: string | null;
    }>;
    recentExpenses: Array<{ category: string; amount: number; date: string }>;
  };
  inventory: {
    summary: {
      totalItems: number;
      lowStockCount: number;
      damagedCount: number;
      ballsAvailable: number;
    };
    lowStockItems: Array<{ name: string; available: number; minLevel: number }>;
    openDamages: Array<{ item: string | null; description: string; status: string }>;
    playersWithoutKit: Array<{ name: string }>;
  };
  integrations: {
    integrations: Array<Record<string, unknown>>;
    recentSyncLogs: Array<Record<string, unknown>>;
    recentImports: Array<Record<string, unknown>>;
    pendingConflicts: Array<Record<string, unknown>>;
    summary: {
      activeIntegrations: number;
      recentErrors: number;
      partialSyncs: number;
      pendingConflicts: number;
    };
  };
  academy: {
    groups: Array<Record<string, unknown>>;
    topTalents: Array<Record<string, unknown>>;
    regressions: Array<Record<string, unknown>>;
    recentAssessments: Array<Record<string, unknown>>;
    activeGoals: Array<Record<string, unknown>>;
    recentTransitions: Array<Record<string, unknown>>;
    scoutingProspects: Array<Record<string, unknown>>;
    scoutingReports: Array<Record<string, unknown>>;
    summary: Record<string, unknown>;
  };
};

export type AiConversationDetail = {
  conversation: AiConversation;
  messages: AiMessage[];
};
