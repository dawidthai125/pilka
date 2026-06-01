import { InjuryCategoriesPanel } from "@/features/injuries/components/injury-categories-panel";
import { getDashboardContext, requireInjuryConfigAccess } from "@/lib/auth/session";
import { getInjuryCategories } from "@/lib/injuries/loaders";

export default async function InjuryCategoriesPage() {
  const { access } = await getDashboardContext();
  requireInjuryConfigAccess(access);

  const categories = await getInjuryCategories(access.clubId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Kategorie urazów</h2>
      <InjuryCategoriesPanel categories={categories} />
    </div>
  );
}
