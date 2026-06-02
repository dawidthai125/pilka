import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { EquipmentSubNav } from "@/features/equipment/components/equipment-sub-nav";

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardModuleShell
      title="Sprzęt klubowy"
      description="Rejestr sprzętu, wydania, stroje i konserwacja."
      nav={<EquipmentSubNav />}
    >
      {children}
    </DashboardModuleShell>
  );
}
