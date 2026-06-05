"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/platform/admin";
import { activateClub, evaluateClubActivationGates } from "@/lib/platform/club-activation";
import { archiveClub, resendOwnerInvite, restoreClub } from "@/lib/platform/club-lifecycle";
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
    const isTest = formData.get("isTest") === "on" || formData.get("isTest") === "true";

    const result = await createClub({
      slug,
      publicName,
      shortName,
      colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
      ownerEmail,
      isTest,
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

export async function fetchClubActivationGates(clubId: string) {
  await requirePlatformAdmin();
  return evaluateClubActivationGates(clubId);
}

export async function activateClubAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  try {
    const result = await activateClub({
      clubId,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    revalidatePath("/platform");
    revalidatePath("/platform/clubs");
    revalidatePath(`/platform/clubs/${clubId}`);
    revalidatePath(`/${result.slug}`);

    if (result.noop) {
      return {
        success: `Klub „${result.publicName}” jest już aktywny.`,
        clubId: result.clubId,
        slug: result.slug,
      };
    }

    return {
      success: `Klub „${result.publicName}” aktywowany. Strona publiczna: /${result.slug}`,
      clubId: result.clubId,
      slug: result.slug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aktywacja klubu nie powiodła się.";
    return { error: message };
  }
}

export async function archiveClubAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  try {
    const result = await archiveClub({
      clubId,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    revalidatePath("/platform");
    revalidatePath("/platform/clubs");
    revalidatePath("/platform/monitoring");
    revalidatePath(`/platform/clubs/${clubId}`);

    if (result.noop) {
      return {
        success: `Klub „${result.publicName}” jest już zarchiwizowany.`,
        clubId: result.clubId,
        slug: result.slug,
      };
    }

    return {
      success: `Klub „${result.publicName}” został zarchiwizowany.`,
      clubId: result.clubId,
      slug: result.slug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Archiwizacja klubu nie powiodła się.";
    return { error: message };
  }
}

export async function restoreClubAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  try {
    const result = await restoreClub({
      clubId,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    revalidatePath("/platform");
    revalidatePath("/platform/clubs");
    revalidatePath("/platform/monitoring");
    revalidatePath(`/platform/clubs/${clubId}`);

    if (result.noop) {
      return {
        success: `Klub „${result.publicName}” jest już w onboardingu.`,
        clubId: result.clubId,
        slug: result.slug,
      };
    }

    return {
      success: `Klub „${result.publicName}” przywrócony do onboardingu. Przejdź bramki aktywacji przed publikacją.`,
      clubId: result.clubId,
      slug: result.slug,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Przywrócenie klubu nie powiodło się.";
    return { error: message };
  }
}

export async function resendOwnerInviteAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const actor = await requirePlatformAdmin();
  const clubId = String(formData.get("clubId") ?? "").trim();
  if (!clubId) return { error: "Brak identyfikatora klubu." };

  try {
    const result = await resendOwnerInvite({
      clubId,
      actor: { id: actor.id, email: actor.email ?? "" },
    });

    revalidatePath("/platform/clubs");
    revalidatePath(`/platform/clubs/${clubId}`);

    return {
      success: `Zaproszenie wysłane ponownie na ${result.ownerEmail}.`,
      clubId: result.clubId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ponowne zaproszenie nie powiodło się.";
    return { error: message };
  }
}
