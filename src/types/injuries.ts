import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  ClipboardList,
  HeartPulse,
  History,
  LayoutDashboard,
  ListTree,
  UserRound,
} from "lucide-react";

export const INJURY_RECORD_STATUSES = [
  "active",
  "rehabilitation",
  "ready_for_training",
  "closed",
] as const;
export type InjuryRecordStatus = (typeof INJURY_RECORD_STATUSES)[number];

export const INJURY_AVAILABILITY_IMPACTS = ["unavailable", "limited"] as const;
export type InjuryAvailabilityImpact = (typeof INJURY_AVAILABILITY_IMPACTS)[number];

export const REHABILITATION_PLAN_STATUSES = ["started", "in_progress", "completed"] as const;
export type RehabilitationPlanStatus = (typeof REHABILITATION_PLAN_STATUSES)[number];

export const RETURN_TO_TRAINING_STATUSES = [
  "no_clearance",
  "individual",
  "partial",
  "full",
] as const;
export type ReturnToTrainingStatus = (typeof RETURN_TO_TRAINING_STATUSES)[number];

export const RETURN_TO_MATCH_STATUSES = ["unavailable", "conditional", "available"] as const;
export type ReturnToMatchStatus = (typeof RETURN_TO_MATCH_STATUSES)[number];

export const INJURY_RECORD_STATUS_LABELS: Record<InjuryRecordStatus, string> = {
  active: "Aktywny",
  rehabilitation: "Rehabilitacja",
  ready_for_training: "Gotowy do treningów",
  closed: "Zamknięty",
};

export const INJURY_AVAILABILITY_IMPACT_LABELS: Record<InjuryAvailabilityImpact, string> = {
  unavailable: "Niedostępny",
  limited: "Ograniczony",
};

export const REHABILITATION_PLAN_STATUS_LABELS: Record<RehabilitationPlanStatus, string> = {
  started: "Rozpoczęta",
  in_progress: "W trakcie",
  completed: "Zakończona",
};

export const RETURN_TO_TRAINING_STATUS_LABELS: Record<ReturnToTrainingStatus, string> = {
  no_clearance: "Brak zgody",
  individual: "Trening indywidualny",
  partial: "Trening częściowy",
  full: "Pełny trening",
};

export const RETURN_TO_MATCH_STATUS_LABELS: Record<ReturnToMatchStatus, string> = {
  unavailable: "Niedostępny",
  conditional: "Warunkowo",
  available: "Dostępny",
};

export type InjuryCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type PlayerInjuryRow = {
  id: string;
  clubId: string;
  playerId: string;
  playerName?: string;
  teamId: string | null;
  teamName?: string;
  categoryId: string | null;
  categoryName?: string;
  injuryDate: string;
  expectedReturnDate: string | null;
  description: string;
  injuryStatus: InjuryRecordStatus;
  availabilityImpact: InjuryAvailabilityImpact | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RehabilitationPlanRow = {
  id: string;
  injuryId: string;
  playerId: string;
  stageLabel: string;
  coachNote: string | null;
  progressNote: string | null;
  status: RehabilitationPlanStatus;
  updatedAt: string;
};

export type ReturnToPlayRow = {
  id: string;
  injuryId: string;
  playerId: string;
  trainingStatus: ReturnToTrainingStatus;
  matchStatus: ReturnToMatchStatus;
  notes: string | null;
  updatedAt: string;
};

export type InjuryDashboardStats = {
  activeInjuries: number;
  inRehabilitation: number;
  returningToMatch: number;
  unavailablePlayers: number;
};

export type PlayerInjuryHistorySummary = {
  playerId: string;
  playerName: string;
  injuryCount: number;
  totalAbsenceDays: number;
  injuries: PlayerInjuryRow[];
};

export type InjuryAiInsight = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

export type InjuryNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const INJURY_NAV: InjuryNavItem[] = [
  { title: "Dashboard", href: "/injuries", icon: LayoutDashboard },
  { title: "Rejestr urazów", href: "/injuries/registry", icon: ClipboardList },
  { title: "Zgłoś uraz", href: "/injuries/report", icon: HeartPulse },
  { title: "Historia", href: "/injuries/history", icon: History },
  { title: "Kategorie", href: "/injuries/categories", icon: ListTree },
  { title: "AI Insights", href: "/injuries/ai", icon: Bot },
  { title: "Mój status", href: "/injuries/portal", icon: UserRound },
];

export const INJURY_PORTAL_NAV: InjuryNavItem[] = [
  { title: "Mój status", href: "/injuries/portal", icon: Activity },
];
