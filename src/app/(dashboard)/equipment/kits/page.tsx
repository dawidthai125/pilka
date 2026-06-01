import { EquipmentKitsPanel } from "@/features/equipment/components/equipment-kits-panel";
import { canManageEquipment } from "@/config/permissions";
import { getDashboardContext, getPlayers, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getEquipmentKits } from "@/lib/equipment/loaders";
import { playerFullName } from "@/lib/players/mappers";

export default async function EquipmentKitsPage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const [kits, players] = await Promise.all([
    getEquipmentKits(access.clubId),
    getPlayers(access.clubId),
  ]);

  return (
    <EquipmentKitsPanel
      kits={kits}
      canManage={canManageEquipment(access.roles)}
      players={players.map((p) => ({ id: p.id, name: playerFullName(p) }))}
    />
  );
}
