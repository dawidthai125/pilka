import { revalidatePath } from "next/cache";

import { REVALIDATE_CRM_PATHS } from "@/lib/crm/constants";

export function revalidateCrmPaths() {
  for (const path of REVALIDATE_CRM_PATHS) {
    revalidatePath(path);
  }
}
