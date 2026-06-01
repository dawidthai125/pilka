import { revalidatePath } from "next/cache";

import { REVALIDATE_EQUIPMENT_PATHS } from "@/types/equipment";

export function revalidateEquipmentPaths() {
  for (const path of REVALIDATE_EQUIPMENT_PATHS) {
    revalidatePath(path);
  }
}
