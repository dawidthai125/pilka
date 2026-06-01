"use server";

import { revalidatePath } from "next/cache";

import { REVALIDATE_COMMUNICATION_PATHS } from "@/lib/communication/constants";

export async function revalidateCommunicationPaths() {
  for (const path of REVALIDATE_COMMUNICATION_PATHS) {
    revalidatePath(path);
  }
}
