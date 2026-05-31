"use server";

import { revalidatePath } from "next/cache";

import { canManageClub, canManageTeams } from "@/config/permissions";
import { DEFAULT_CLUB_ID, requireAccessContext } from "@/lib/auth/session";
import { parseTeamCategory } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";

export type ClubActionState = {
  error?: string;
  success?: string;
};

export async function updateClubProfile(
  _prev: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const access = await requireAccessContext();

  if (!canManageClub(access.roles)) {
    return { error: "Brak uprawnień do edycji profilu klubu." };
  }

  const publicName = String(formData.get("publicName") ?? "").trim();
  const officialName = String(formData.get("officialName") ?? "").trim();

  if (!publicName || !officialName) {
    return { error: "Podaj nazwę publiczną i nazwę oficjalną klubu." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({
      public_name: publicName,
      official_name: officialName,
      association: String(formData.get("association") ?? "").trim() || null,
      competition_level: String(formData.get("competitionLevel") ?? "").trim() || null,
      voivodeship: String(formData.get("voivodeship") ?? "").trim() || null,
    })
    .eq("id", DEFAULT_CLUB_ID);

  if (error) {
    return { error: "Nie udało się zaktualizować profilu klubu." };
  }

  revalidatePath("/club");
  revalidatePath("/dashboard");
  return { success: "Profil klubu zaktualizowany." };
}

export async function createTeam(
  _prev: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const access = await requireAccessContext();

  if (!canManageTeams(access.roles)) {
    return { error: "Brak uprawnień do zarządzania drużynami." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const categoryResult = parseTeamCategory(String(formData.get("category") ?? "seniors"));
  const season = String(formData.get("season") ?? "").trim() || null;

  if (!name) {
    return { error: "Podaj nazwę drużyny." };
  }

  if (!categoryResult.success) {
    return { error: "Nieprawidłowa kategoria drużyny." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    club_id: DEFAULT_CLUB_ID,
    name,
    category: categoryResult.data,
    season,
    is_active: true,
  });

  if (error) {
    return { error: "Nie udało się utworzyć drużyny." };
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard");
  return { success: "Drużyna utworzona." };
}

export async function toggleTeamActive(teamId: string, isActive: boolean) {
  const access = await requireAccessContext();

  if (!canManageTeams(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ is_active: isActive })
    .eq("id", teamId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Nie udało się zaktualizować drużyny." };
  }

  revalidatePath("/teams");
  return { success: "Status drużyny zaktualizowany." };
}
