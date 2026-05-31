import { AcademySubNav } from "@/features/academy/components/academy-sub-nav";
import { getAcademyNavItems } from "@/lib/academy/constants";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();
  const navItems = getAcademyNavItems(access.roles);

  return (
    <div className="space-y-6">
      <AcademySubNav items={navItems} />
      {children}
    </div>
  );
}
