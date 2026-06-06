export type MemberActionState = {
  error?: string;
  success?: string;
  inviteDelivery?: "email" | "login_required";
};

export type BulkMemberOperation = "suspend" | "reactivate";

export type BulkMemberItemStatus = "success" | "skipped" | "failed";

export type BulkMemberActionItem = {
  membershipId: string;
  status: BulkMemberItemStatus;
  reason?: string;
};

export type BulkMemberActionResult = {
  operation: BulkMemberOperation;
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  items: BulkMemberActionItem[];
};

export type BulkMemberActionState = {
  error?: string;
  result?: BulkMemberActionResult;
};

export function formatBulkMemberSummary(result: BulkMemberActionResult): string {
  const verb =
    result.operation === "suspend"
      ? { past: "Zawieszono", label: "zawieszenia" }
      : { past: "Przywrócono", label: "przywracania" };

  if (result.succeeded === result.total) {
    return `${verb.past} ${result.succeeded} ${
      result.succeeded === 1 ? "członka" : "członków"
    }.`;
  }

  const parts = [`${verb.past} ${result.succeeded} z ${result.total} członków.`];
  if (result.skipped > 0) {
    parts.push(
      `${result.skipped} pominięto (brak uprawnień lub niewłaściwy status).`,
    );
  }
  if (result.failed > 0) {
    parts.push(`${result.failed} nie udało się wykonać (${verb.label}).`);
  }
  return parts.join(" ");
}
