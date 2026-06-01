import { revalidatePath } from "next/cache";

export function revalidateInjuryPaths(injuryId?: string) {
  revalidatePath("/injuries");
  revalidatePath("/injuries/registry");
  revalidatePath("/injuries/history");
  revalidatePath("/injuries/portal");
  revalidatePath("/attendance");
  if (injuryId) revalidatePath(`/injuries/${injuryId}`);
}
