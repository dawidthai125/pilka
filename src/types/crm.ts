import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  Contact,
  Gift,
  Handshake,
  Heart,
  Kanban,
  LayoutDashboard,
  Users,
} from "lucide-react";

export const CRM_CONTACT_TYPES = [
  "sponsor",
  "partner",
  "parent",
  "volunteer",
  "donor",
  "company",
  "institution",
  "media",
] as const;
export type CrmContactType = (typeof CRM_CONTACT_TYPES)[number];

export const CRM_PIPELINE_STATUSES = [
  "new_contact",
  "conversation",
  "offer_sent",
  "negotiation",
  "active_sponsor",
  "lost",
] as const;
export type CrmPipelineStatus = (typeof CRM_PIPELINE_STATUSES)[number];

export const CRM_INTERACTION_TYPES = [
  "meeting",
  "phone",
  "email",
  "event",
  "sponsorship",
] as const;
export type CrmInteractionType = (typeof CRM_INTERACTION_TYPES)[number];

export const CRM_TASK_TYPES = ["call_back", "send_offer", "meeting", "reminder"] as const;
export type CrmTaskType = (typeof CRM_TASK_TYPES)[number];

export const CRM_TASK_STATUSES = ["open", "done", "cancelled"] as const;
export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number];

export const CRM_EVENT_TYPES = [
  "tournament",
  "club_picnic",
  "sponsor_meeting",
  "parent_meeting",
  "other",
] as const;
export type CrmEventType = (typeof CRM_EVENT_TYPES)[number];

export const CRM_VOLUNTEER_AREAS = [
  "match_help",
  "transport",
  "event_org",
  "tournament_ops",
] as const;
export type CrmVolunteerArea = (typeof CRM_VOLUNTEER_AREAS)[number];

export const CRM_EVENT_RSVP = ["invited", "confirmed", "declined", "attended"] as const;
export type CrmEventRsvp = (typeof CRM_EVENT_RSVP)[number];

export const CRM_CONTACT_TYPE_LABELS: Record<CrmContactType, string> = {
  sponsor: "Sponsor",
  partner: "Partner",
  parent: "Rodzic",
  volunteer: "Wolontariusz",
  donor: "Darczyńca",
  company: "Firma",
  institution: "Instytucja",
  media: "Media",
};

export const CRM_PIPELINE_STATUS_LABELS: Record<CrmPipelineStatus, string> = {
  new_contact: "Nowy kontakt",
  conversation: "Rozmowa",
  offer_sent: "Oferta wysłana",
  negotiation: "Negocjacje",
  active_sponsor: "Aktywny sponsor",
  lost: "Utracony",
};

export const CRM_INTERACTION_TYPE_LABELS: Record<CrmInteractionType, string> = {
  meeting: "Spotkanie",
  phone: "Telefon",
  email: "Email",
  event: "Wydarzenie",
  sponsorship: "Sponsoring",
};

export const CRM_TASK_TYPE_LABELS: Record<CrmTaskType, string> = {
  call_back: "Oddzwonić",
  send_offer: "Wysłać ofertę",
  meeting: "Spotkanie",
  reminder: "Przypomnienie",
};

export const CRM_EVENT_TYPE_LABELS: Record<CrmEventType, string> = {
  tournament: "Turniej",
  club_picnic: "Piknik klubowy",
  sponsor_meeting: "Spotkanie sponsorów",
  parent_meeting: "Zebranie rodziców",
  other: "Inne",
};

export const CRM_VOLUNTEER_AREA_LABELS: Record<CrmVolunteerArea, string> = {
  match_help: "Pomoc przy meczach",
  transport: "Transport",
  event_org: "Organizacja wydarzeń",
  tournament_ops: "Obsługa turniejów",
};

export type CrmContactRow = {
  id: string;
  contactType: CrmContactType;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  pipelineStatus: CrmPipelineStatus;
  profileId: string | null;
  playerId: string | null;
  sponsorId: string | null;
  partnerServices: string | null;
  partnerDiscounts: string | null;
  volunteerAreas: CrmVolunteerArea[];
  isActive: boolean;
  updatedAt: string;
};

export type CrmInteractionRow = {
  id: string;
  contactId: string;
  interactionType: CrmInteractionType;
  title: string;
  body: string | null;
  occurredAt: string;
  authorName?: string;
};

export type CrmTaskRow = {
  id: string;
  contactId: string | null;
  contactName?: string;
  taskType: CrmTaskType;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: CrmTaskStatus;
};

export type CrmEventRow = {
  id: string;
  eventType: CrmEventType;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  attendeeCount: number;
};

export type CrmDonationRow = {
  id: string;
  contactId: string | null;
  contactName?: string;
  amount: number;
  currency: string;
  donatedAt: string;
  source: string | null;
  purpose: string | null;
  financeIncomeId: string | null;
};

export type CrmDashboardStats = {
  activeSponsors: number;
  newContacts: number;
  openTasks: number;
  donationsTotal: number;
  upcomingEvents: number;
};

export type CrmParentContext = {
  contact: CrmContactRow | null;
  children: Array<{ id: string; name: string; teamName: string | null }>;
  recentCommunications: number;
  attendanceSummary: { present: number; total: number };
};

export type CrmPipelineColumn = {
  status: CrmPipelineStatus;
  contacts: CrmContactRow[];
};

export type CrmAiInsight = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

export type CrmAiDraftKind =
  | "sponsor_offer"
  | "thank_you"
  | "parent_email"
  | "meeting_plan";

export type CrmAiDraftResult = {
  title: string;
  body: string;
  model: string;
  aiUsed: boolean;
};

export const CRM_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/crm", label: "Przegląd", icon: LayoutDashboard },
  { href: "/crm/contacts", label: "Kontakty", icon: Contact },
  { href: "/crm/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/crm/parents", label: "Rodzice", icon: Users },
  { href: "/crm/volunteers", label: "Wolontariusze", icon: Heart },
  { href: "/crm/partners", label: "Partnerzy", icon: Handshake },
  { href: "/crm/donations", label: "Darowizny", icon: Gift },
  { href: "/crm/events", label: "Wydarzenia", icon: CalendarDays },
  { href: "/crm/tasks", label: "Zadania", icon: ClipboardList },
  { href: "/crm/ai", label: "AI Assistant", icon: Bot },
];

export const REVALIDATE_CRM_PATHS = [
  "/crm",
  "/crm/contacts",
  "/crm/pipeline",
  "/crm/parents",
  "/crm/volunteers",
  "/crm/partners",
  "/crm/donations",
  "/crm/events",
  "/crm/tasks",
  "/crm/portal",
  "/notifications",
];
