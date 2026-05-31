export const SPONSOR_COOPERATION_STATUSES = [
  "active",
  "expiring",
  "ended",
  "potential",
] as const;

export type SponsorCooperationStatus = (typeof SPONSOR_COOPERATION_STATUSES)[number];

export const SPONSOR_CONTRACT_STATUSES = [
  "active",
  "expiring",
  "expired",
] as const;

export type SponsorContractStatus = (typeof SPONSOR_CONTRACT_STATUSES)[number];

export const SPONSOR_LEAD_STATUSES = [
  "new",
  "in_discussion",
  "offer_sent",
  "negotiation",
  "won",
  "rejected",
] as const;

export type SponsorLeadStatus = (typeof SPONSOR_LEAD_STATUSES)[number];

export const SPONSOR_NOTE_TYPES = ["phone", "meeting", "email", "note"] as const;

export type SponsorNoteType = (typeof SPONSOR_NOTE_TYPES)[number];

export const SPONSOR_PUBLICATION_SOURCES = [
  "facebook",
  "instagram",
  "website",
  "other",
] as const;

export type SponsorPublicationSource = (typeof SPONSOR_PUBLICATION_SOURCES)[number];

export const SPONSOR_EXPOSURE_TYPES = [
  "publication",
  "sponsored_match",
  "sponsored_event",
] as const;

export type SponsorExposureType = (typeof SPONSOR_EXPOSURE_TYPES)[number];

export const SPONSOR_FINANCIAL_ENTRY_TYPES = [
  "payment",
  "installment",
  "invoice",
] as const;

export type SponsorFinancialEntryType = (typeof SPONSOR_FINANCIAL_ENTRY_TYPES)[number];

export const SPONSOR_FINANCIAL_STATUSES = [
  "planned",
  "pending",
  "paid",
  "overdue",
  "cancelled",
] as const;

export type SponsorFinancialStatus = (typeof SPONSOR_FINANCIAL_STATUSES)[number];

export const SPONSOR_REPORT_STATUSES = ["draft", "published"] as const;

export type SponsorReportStatus = (typeof SPONSOR_REPORT_STATUSES)[number];

export type Sponsor = {
  id: string;
  clubId: string;
  profileId: string | null;
  companyName: string;
  logoUrl: string | null;
  nip: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactPosition: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  cooperationStatus: SponsorCooperationStatus;
  createdAt: string;
  updatedAt: string;
};

export type SponsorContract = {
  id: string;
  clubId: string;
  sponsorId: string;
  name: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  benefitsDescription: string | null;
  status: SponsorContractStatus;
  createdAt: string;
  updatedAt: string;
};

export type SponsorContractAttachment = {
  id: string;
  clubId: string;
  contractId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string | null;
  createdAt: string;
};

export type SponsorLead = {
  id: string;
  clubId: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: SponsorLeadStatus;
  notes: string | null;
  assignedTo: string | null;
  convertedSponsorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorNote = {
  id: string;
  clubId: string;
  sponsorId: string;
  noteType: SponsorNoteType;
  content: string;
  contactDate: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorPublication = {
  id: string;
  clubId: string;
  title: string;
  publishedAt: string;
  description: string | null;
  imageUrl: string | null;
  source: SponsorPublicationSource;
  sponsorIds?: string[];
  sponsorNames?: string[];
  createdAt: string;
  updatedAt: string;
};

export type SponsorExposure = {
  id: string;
  clubId: string;
  sponsorId: string;
  exposureType: SponsorExposureType;
  title: string;
  description: string | null;
  exposureDate: string;
  publicationId: string | null;
  matchId: string | null;
  createdAt: string;
};

export type SponsorReport = {
  id: string;
  clubId: string;
  sponsorId: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  content: Record<string, unknown>;
  status: SponsorReportStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorFinancialEntry = {
  id: string;
  clubId: string;
  sponsorId: string;
  contractId: string | null;
  entryType: SponsorFinancialEntryType;
  amount: number;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  status: SponsorFinancialStatus;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorDetailData = {
  sponsor: Sponsor;
  contracts: SponsorContract[];
  contractAttachments: SponsorContractAttachment[];
  notes: SponsorNote[];
  exposure: SponsorExposure[];
  reports: SponsorReport[];
  financialEntries: SponsorFinancialEntry[];
};

export type SponsorPortalData = {
  sponsor: Sponsor;
  contracts: SponsorContract[];
  reports: SponsorReport[];
  publications: SponsorPublication[];
  upcomingMatches: Array<{
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    matchDate: string;
    matchTime: string;
    status: string;
  }>;
  recentResults: Array<{
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number | null;
    awayScore: number | null;
    matchDate: string;
  }>;
};

export type SponsorDashboardStats = {
  totalSponsors: number;
  activeContracts: number;
  expiringContracts: number;
  activeContractValue: number;
  openLeads: number;
  publicationsThisMonth: number;
};
