import type {
  FinanceBudget,
  FinanceDocument,
  FinanceExpense,
  FinanceFeePayment,
  FinanceFeePlan,
  FinanceGrant,
  FinanceIncome,
  FinancePlayerFee,
  FinanceReport,
  FinanceReportContent,
} from "@/types/finance";

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function str(value: unknown): string {
  return String(value ?? "");
}

function nullableStr(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

export function mapFinanceIncome(row: Record<string, unknown>): FinanceIncome {
  const author = row.author as Record<string, unknown> | null | undefined;
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    transactionDate: str(row.transaction_date),
    amount: num(row.amount),
    currency: str(row.currency) || "PLN",
    description: str(row.description),
    category: row.category as FinanceIncome["category"],
    sponsorId: nullableStr(row.sponsor_id),
    grantId: nullableStr(row.grant_id),
    playerFeeId: nullableStr(row.player_fee_id),
    createdBy: nullableStr(row.created_by),
    createdByName: author ? nullableStr(author.full_name) : null,
    createdAt: str(row.created_at),
  };
}

export function mapFinanceExpense(row: Record<string, unknown>): FinanceExpense {
  const author = row.author as Record<string, unknown> | null | undefined;
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    transactionDate: str(row.transaction_date),
    amount: num(row.amount),
    currency: str(row.currency) || "PLN",
    description: str(row.description),
    category: row.category as FinanceExpense["category"],
    attachmentUrl: nullableStr(row.attachment_url),
    attachmentName: nullableStr(row.attachment_name),
    createdBy: nullableStr(row.created_by),
    createdByName: author ? nullableStr(author.full_name) : null,
    createdAt: str(row.created_at),
  };
}

export function mapFinanceFeePlan(row: Record<string, unknown>): FinanceFeePlan {
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    name: str(row.name),
    feeType: row.fee_type as FinanceFeePlan["feeType"],
    amount: num(row.amount),
    currency: str(row.currency) || "PLN",
    teamId: nullableStr(row.team_id),
    isActive: Boolean(row.is_active),
  };
}

export function mapFinancePlayerFee(row: Record<string, unknown>): FinancePlayerFee {
  const player = row.player as Record<string, unknown> | null | undefined;
  const amountDue = num(row.amount_due);
  const amountPaid = num(row.amount_paid);
  const playerName = player
    ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
    : undefined;
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    playerId: str(row.player_id),
    playerName: playerName || undefined,
    feePlanId: nullableStr(row.fee_plan_id),
    name: str(row.name),
    dueDate: str(row.due_date),
    amountDue,
    amountPaid,
    amountRemaining: Math.max(0, amountDue - amountPaid),
    currency: str(row.currency) || "PLN",
    status: row.status as FinancePlayerFee["status"],
    periodMonth: nullableStr(row.period_month),
  };
}

export function mapFinanceFeePayment(row: Record<string, unknown>): FinanceFeePayment {
  const recorder = row.recorder as Record<string, unknown> | null | undefined;
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    playerFeeId: str(row.player_fee_id),
    paymentDate: str(row.payment_date),
    amount: num(row.amount),
    note: nullableStr(row.note),
    recordedBy: nullableStr(row.recorded_by),
    recordedByName: recorder ? nullableStr(recorder.full_name) : null,
    createdAt: str(row.created_at),
  };
}

export function mapFinanceGrant(row: Record<string, unknown>): FinanceGrant {
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    source: str(row.source),
    amount: num(row.amount),
    currency: str(row.currency) || "PLN",
    periodStart: str(row.period_start),
    periodEnd: str(row.period_end),
    status: row.status as FinanceGrant["status"],
    description: nullableStr(row.description),
  };
}

export function mapFinanceBudget(
  row: Record<string, unknown>,
  executedAmount = 0,
): FinanceBudget {
  const team = row.team as Record<string, unknown> | null | undefined;
  const plannedAmount = num(row.planned_amount);
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    name: str(row.name),
    budgetType: row.budget_type as FinanceBudget["budgetType"],
    teamId: nullableStr(row.team_id),
    teamName: team ? str(team.name) : null,
    season: nullableStr(row.season),
    periodStart: str(row.period_start),
    periodEnd: str(row.period_end),
    plannedAmount,
    executedAmount,
    difference: plannedAmount - executedAmount,
    currency: str(row.currency) || "PLN",
    notes: nullableStr(row.notes),
  };
}

export function mapFinanceDocument(row: Record<string, unknown>): FinanceDocument {
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    documentType: row.document_type as FinanceDocument["documentType"],
    title: str(row.title),
    storagePath: str(row.storage_path),
    fileName: str(row.file_name),
    fileSize: row.file_size == null ? null : num(row.file_size),
    mimeType: nullableStr(row.mime_type),
    issueDate: nullableStr(row.issue_date),
    amount: row.amount == null ? null : num(row.amount),
    uploadedBy: nullableStr(row.uploaded_by),
    createdAt: str(row.created_at),
  };
}

export function mapFinanceReport(row: Record<string, unknown>): FinanceReport {
  const content = (row.content ?? {}) as Record<string, unknown>;
  return {
    id: str(row.id),
    clubId: str(row.club_id),
    title: str(row.title),
    periodType: row.period_type as FinanceReport["periodType"],
    periodStart: str(row.period_start),
    periodEnd: str(row.period_end),
    content: {
      totalIncome: num(content.totalIncome),
      totalExpenses: num(content.totalExpenses),
      balance: num(content.balance),
      overdueFeesCount: num(content.overdueFeesCount),
      incomeByCategory: content.incomeByCategory as FinanceReportContent["incomeByCategory"],
      expensesByCategory: content.expensesByCategory as FinanceReportContent["expensesByCategory"],
      narrative: nullableStr(content.narrative) ?? undefined,
    },
    status: row.status as FinanceReport["status"],
    generatedBy: nullableStr(row.generated_by),
    createdAt: str(row.created_at),
  };
}

export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((acc, row) => acc + row.amount, 0);
}
