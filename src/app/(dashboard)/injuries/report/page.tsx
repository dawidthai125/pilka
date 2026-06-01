import { InjuryReportForm } from "@/features/injuries/components/injury-report-form";
import { getDashboardContext, requireInjuryStaffAccess } from "@/lib/auth/session";
import { getInjuryCategories } from "@/lib/injuries/loaders";
import { createClient } from "@/lib/supabase/server";

export default async function InjuryReportPage() {
  const { access } = await getDashboardContext();
  requireInjuryStaffAccess(access);

  const supabase = await createClient();
  const [{ data: players }, categories] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("club_id", access.clubId)
      .order("last_name"),
    getInjuryCategories(access.clubId),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Zgłoś uraz</h2>
      <InjuryReportForm
        players={(players ?? []).map((p) => ({
          id: String(p.id),
          name: `${p.first_name} ${p.last_name}`,
        }))}
        categories={categories}
      />
    </div>
  );
}
