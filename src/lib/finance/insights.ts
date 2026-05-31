import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";
import { sumAmounts } from "@/lib/finance/mappers";
import type { FinanceReportContent } from "@/types/finance";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";

export async function buildFinanceAiContext(clubId: string = DEFAULT_CLUB_ID) {
  const supabase = await createClient();

  const [incomeRes, expenseRes, feesRes, sponsorsRes] = await Promise.all([
    supabase
      .from("finance_income")
      .select("amount, category, transaction_date")
      .eq("club_id", clubId)
      .order("transaction_date", { ascending: false })
      .limit(100),
    supabase
      .from("finance_expenses")
      .select("amount, category, transaction_date")
      .eq("club_id", clubId)
      .order("transaction_date", { ascending: false })
      .limit(100),
    supabase
      .from("finance_player_fees")
      .select("id, name, amount_due, amount_paid, status, due_date, player:player_id(first_name, last_name)")
      .eq("club_id", clubId)
      .in("status", ["partial", "overdue"])
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(50),
    supabase
      .from("sponsor_financial_entries")
      .select("id, amount, status, due_date, sponsors(company_name)")
      .eq("club_id", clubId)
      .in("status", ["pending", "overdue", "planned"])
      .limit(30),
  ]);

  const totalIncome = sumAmounts(
    (incomeRes.data ?? []).map((r) => ({ amount: Number(r.amount) })),
  );
  const totalExpenses = sumAmounts(
    (expenseRes.data ?? []).map((r) => ({ amount: Number(r.amount) })),
  );

  const feeRows = (feesRes.data ?? []) as Array<Record<string, unknown>>;
  return {
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      overdueFeesCount: feeRows.filter((f) => String(f.status) !== "paid").length,
    },
    overduePlayerFees: feeRows.slice(0, 15).map((f) => {
      const player = f.player as { first_name?: string; last_name?: string } | null;
      return {
        name: String(f.name),
        player: player ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() : null,
        amountDue: Number(f.amount_due),
        amountPaid: Number(f.amount_paid),
        status: String(f.status),
        dueDate: String(f.due_date),
      };
    }),
    unpaidSponsorEntries: (sponsorsRes.data ?? []).map((e) => ({
      amount: Number(e.amount),
      status: e.status,
      dueDate: e.due_date,
      sponsor: (e.sponsors as { company_name?: string } | null)?.company_name ?? null,
    })),
    recentExpenses: (expenseRes.data ?? []).slice(0, 10).map((e) => ({
      category: e.category,
      amount: Number(e.amount),
      date: e.transaction_date,
    })),
  };
}

export async function buildFinanceReportContent(
  clubId: string,
  periodStart: string,
  periodEnd: string,
  clubName: string,
): Promise<FinanceReportContent> {
  const supabase = await createClient();

  const [incomeRes, expenseRes, feesRes] = await Promise.all([
    supabase
      .from("finance_income")
      .select("amount, category")
      .eq("club_id", clubId)
      .gte("transaction_date", periodStart)
      .lte("transaction_date", periodEnd),
    supabase
      .from("finance_expenses")
      .select("amount, category")
      .eq("club_id", clubId)
      .gte("transaction_date", periodStart)
      .lte("transaction_date", periodEnd),
    supabase
      .from("finance_player_fees")
      .select("id, status")
      .eq("club_id", clubId)
      .in("status", ["partial", "overdue"])
      .lt("due_date", periodEnd)
      .lt("due_date", new Date().toISOString().slice(0, 10)),
  ]);

  const incomeRows = incomeRes.data ?? [];
  const expenseRows = expenseRes.data ?? [];
  const totalIncome = sumAmounts(incomeRows.map((r) => ({ amount: Number(r.amount) })));
  const totalExpenses = sumAmounts(expenseRows.map((r) => ({ amount: Number(r.amount) })));

  const incomeByCategory: Record<string, number> = {};
  for (const row of incomeRows) {
    const key = String(row.category);
    incomeByCategory[key] = (incomeByCategory[key] ?? 0) + Number(row.amount);
  }

  const expensesByCategory: Record<string, number> = {};
  for (const row of expenseRows) {
    const key = String(row.category);
    expensesByCategory[key] = (expensesByCategory[key] ?? 0) + Number(row.amount);
  }

  const content: FinanceReportContent = {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    overdueFeesCount: (feesRes.data ?? []).length,
    incomeByCategory,
    expensesByCategory,
  };

  if (isOpenAiConfigured()) {
    try {
      const narrative = await generateAiReportContent(
        `Przygotuj krótkie podsumowanie raportu finansowego klubu ${clubName} za okres ${periodStart} — ${periodEnd}. ` +
          `Uwzględnij saldo, główne kategorie przychodów i kosztów oraz zaległe składki.`,
        clubName,
        JSON.stringify(content),
      );
      content.narrative = narrative;
    } catch {
      content.narrative = undefined;
    }
  }

  return content;
}

export async function computeBudgetExecutionsBatch(
  clubId: string,
  budgets: Array<{ period_start: string; period_end: string }>,
): Promise<Map<string, number>> {
  if (!budgets.length) return new Map();

  const minStart = budgets.reduce(
    (min, b) => (b.period_start < min ? b.period_start : min),
    budgets[0]!.period_start,
  );
  const maxEnd = budgets.reduce(
    (max, b) => (b.period_end > max ? b.period_end : max),
    budgets[0]!.period_end,
  );

  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("finance_expenses")
    .select("amount, transaction_date")
    .eq("club_id", clubId)
    .gte("transaction_date", minStart)
    .lte("transaction_date", maxEnd)
    .limit(5000);

  const rows = expenses ?? [];
  const result = new Map<string, number>();

  for (const budget of budgets) {
    const key = `${budget.period_start}:${budget.period_end}`;
    const total = rows
      .filter(
        (r) =>
          r.transaction_date >= budget.period_start && r.transaction_date <= budget.period_end,
      )
      .reduce((sum, r) => sum + Number(r.amount), 0);
    result.set(key, total);
  }

  return result;
}

export async function computeBudgetExecution(
  clubId: string,
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("finance_expenses")
    .select("amount")
    .eq("club_id", clubId)
    .gte("transaction_date", periodStart)
    .lte("transaction_date", periodEnd)
    .limit(5000);

  return sumAmounts((expenses ?? []).map((r) => ({ amount: Number(r.amount) })));
}
