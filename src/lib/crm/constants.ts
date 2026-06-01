export {
  CRM_CONTACT_TYPE_LABELS,
  CRM_EVENT_TYPE_LABELS,
  CRM_INTERACTION_TYPE_LABELS,
  CRM_NAV,
  CRM_PIPELINE_STATUS_LABELS,
  CRM_TASK_TYPE_LABELS,
  CRM_VOLUNTEER_AREA_LABELS,
  REVALIDATE_CRM_PATHS,
} from "@/types/crm";

export const PIPELINE_KANBAN_ORDER = [
  "new_contact",
  "conversation",
  "offer_sent",
  "negotiation",
  "active_sponsor",
  "lost",
] as const;

export const PIPELINE_COLUMN_COLORS: Record<string, string> = {
  new_contact: "border-slate-300 bg-slate-50",
  conversation: "border-blue-300 bg-blue-50",
  offer_sent: "border-amber-300 bg-amber-50",
  negotiation: "border-orange-300 bg-orange-50",
  active_sponsor: "border-green-300 bg-green-50",
  lost: "border-red-300 bg-red-50",
};
