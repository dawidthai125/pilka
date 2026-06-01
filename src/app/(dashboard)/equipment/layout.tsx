import { EquipmentSubNav } from "@/features/equipment/components/equipment-sub-nav";

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold">Equipment & Assets</h1>
        <p className="text-sm text-muted-foreground">
          Rejestr sprzętu klubowego, wydania, stroje i konserwacja.
        </p>
      </div>
      <EquipmentSubNav />
      {children}
    </div>
  );
}
