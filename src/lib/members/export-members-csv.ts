import { ROLE_LABELS } from "@/config/permissions";
import type { ClubMemberRow } from "@/lib/auth/session";

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Aktywny",
  invited: "Zaproszony",
  suspended: "Zawieszony",
};

export const MEMBERS_CSV_HEADERS = [
  "Imię i nazwisko",
  "Email",
  "Rola",
  "Status",
  "Drużyna",
  "Data dołączenia",
] as const;

/** Neutralizuje formuły CSV/Excel (=,+,-,@) przy eksporcie. */
function sanitizeCsvCell(value: string): string {
  let text = String(value ?? "").trim();
  while (/^[=+\-@\t\r]/.test(text)) {
    text = text.slice(1).trimStart();
  }
  return text;
}

function escapeCsvCell(value: string): string {
  const sanitized = sanitizeCsvCell(value);
  if (sanitized.includes('"') || sanitized.includes(";") || sanitized.includes("\n")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

function formatJoinDateExport(value: string): string {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function memberRowToCsvCells(member: ClubMemberRow): string[] {
  return [
    member.profile?.full_name ?? "",
    member.profile?.email ?? "",
    ROLE_LABELS[member.role] ?? member.role,
    MEMBERSHIP_STATUS_LABELS[member.status] ?? member.status,
    member.team?.name ?? "",
    formatJoinDateExport(member.created_at),
  ];
}

export function buildMembersCsvContent(members: ClubMemberRow[]): string {
  const header = MEMBERS_CSV_HEADERS.map(escapeCsvCell).join(";");
  const body = members.map((member) =>
    memberRowToCsvCells(member).map(escapeCsvCell).join(";"),
  );
  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function defaultMembersCsvFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `czlonkowie-${date}.csv`;
}

export function downloadMembersCsv(
  members: ClubMemberRow[],
  filename = defaultMembersCsvFilename(),
): void {
  const content = buildMembersCsvContent(members);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
