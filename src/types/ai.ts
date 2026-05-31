export type AiMessageRole = "user" | "assistant" | "system";

export type AiReportCategory =
  | "matches"
  | "trainings"
  | "players"
  | "management"
  | "sponsors";

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
};

export type AiConversationDetail = {
  conversation: AiConversation;
  messages: AiMessage[];
};
