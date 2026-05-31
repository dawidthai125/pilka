import type {
  SponsorCooperationStatus,
  SponsorContractStatus,
  SponsorExposureType,
  SponsorFinancialEntryType,
  SponsorFinancialStatus,
  SponsorLeadStatus,
  SponsorNoteType,
  SponsorPublicationSource,
  SponsorReportStatus,
} from "@/types/sponsors";

export {
  SPONSOR_COOPERATION_STATUSES,
  SPONSOR_CONTRACT_STATUSES,
  SPONSOR_LEAD_STATUSES,
  SPONSOR_NOTE_TYPES,
  SPONSOR_PUBLICATION_SOURCES,
} from "@/types/sponsors";

export const SPONSOR_COOPERATION_STATUS_LABELS: Record<SponsorCooperationStatus, string> = {
  active: "Aktywny",
  expiring: "Wygasający",
  ended: "Zakończony",
  potential: "Potencjalny sponsor",
};

export const SPONSOR_CONTRACT_STATUS_LABELS: Record<SponsorContractStatus, string> = {
  active: "Aktywna",
  expiring: "Wygasająca",
  expired: "Wygasła",
};

export const SPONSOR_LEAD_STATUS_LABELS: Record<SponsorLeadStatus, string> = {
  new: "Nowy",
  in_discussion: "W trakcie rozmów",
  offer_sent: "Oferta wysłana",
  negotiation: "Negocjacje",
  won: "Pozyskany",
  rejected: "Odrzucony",
};

export const SPONSOR_NOTE_TYPE_LABELS: Record<SponsorNoteType, string> = {
  phone: "Telefon",
  meeting: "Spotkanie",
  email: "Email",
  note: "Notatka",
};

export const SPONSOR_PUBLICATION_SOURCE_LABELS: Record<SponsorPublicationSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  website: "Strona klubu",
  other: "Inne",
};

export const SPONSOR_EXPOSURE_TYPE_LABELS: Record<SponsorExposureType, string> = {
  publication: "Publikacja",
  sponsored_match: "Mecz sponsorowany",
  sponsored_event: "Wydarzenie sponsorowane",
};

export const SPONSOR_FINANCIAL_ENTRY_TYPE_LABELS: Record<SponsorFinancialEntryType, string> = {
  payment: "Wpłata",
  installment: "Rata",
  invoice: "Faktura",
};

export const SPONSOR_FINANCIAL_STATUS_LABELS: Record<SponsorFinancialStatus, string> = {
  planned: "Planowana",
  pending: "Oczekująca",
  paid: "Opłacona",
  overdue: "Przeterminowana",
  cancelled: "Anulowana",
};

export const SPONSOR_REPORT_STATUS_LABELS: Record<SponsorReportStatus, string> = {
  draft: "Szkic",
  published: "Opublikowany",
};

export const SPONSOR_CONTRACT_REMINDER_DAYS = [90, 60, 30, 14, 7] as const;

export type SponsorContractReminderDays = (typeof SPONSOR_CONTRACT_REMINDER_DAYS)[number];

export const DEFAULT_CURRENCY = "PLN";
