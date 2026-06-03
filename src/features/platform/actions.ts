"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/platform/admin";
import { createClub } from "@/lib/platform/club-bootstrap";
import { listPlatformClubs } from "@/lib/platform/onboarding-status";
import {
  deriveShortName,
  slugifyClubInput,
  validateClubSlug,
  validateHexColor,
  validateOwnerEmail,
} from "@/lib/platform/slug";

export type PlatformActionState = {
  error?: string;
  success?: string;
  clubId?: string;
  slug?: string;
};

export async function createClubAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requirePlatformAdmin();

  const publicName = String(formData.get("publicName") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#0B3D2E").trim();
  const secondaryColor = String(formData.get("secondaryColor") ?? "#F4C430").trim();
  const accentColor = String(formData.get("accentColor") ?? "#FFFFFF").trim();
  const shortName = String(formData.get("shortName") ?? "").trim() || deriveShortName(publicName);

  if (!publicName || publicName.length < 2) {
    return { error: "Podaj nazwę klubu (min. 2 znaki)." };
  }

  const slug = slugifyClubInput(slugRaw || publicName);
  const slugError = validateClubSlug(slug);
  if (slugError) return { error: slugError };

  const emailError = validateOwnerEmail(ownerEmail);
  if (emailError) return { error: emailError };

  for (const color of [primaryColor, secondaryColor, accentColor]) {
    if (!validateHexColor(color)) return { error: "Kolory muszą być w formacie #RRGGBB." };
  }

  try {
    const result = await createClub({
      slug,
      publicName,
      shortName,
      colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
      ownerEmail,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    revalidatePath("/platform/clubs");
    return {
      success: `Klub „${result.publicName}” utworzony. Strona publiczna: /${result.slug}`,
      clubId: result.clubId,
      slug: result.slug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się utworzyć klubu.";
    return { error: message };
  }
}

export async function fetchPlatformClubs(filter?: string) {
  await requirePlatformAdmin();
  return listPlatformClubs(filter);
}
