"use server";

import { randomUUID } from "node:crypto";

import {
  canCreateCommunication,
  canManageCommunication,
  canPublishCommunication,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import {
  dispatchCommunicationNotifications,
  getAnnouncementRecipientUserIds,
  getChatNotificationRecipients,
  getTeamMemberUserIds,
} from "@/lib/communication/dispatch";
import { generateCommunicationDraft } from "@/lib/communication/generator";
import { revalidateCommunicationPaths } from "@/lib/communication/revalidate";
import { mapAttendanceResponse } from "@/lib/communication/mappers";
import { createClient } from "@/lib/supabase/server";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_VISIBILITIES,
  ATTENDANCE_RESPONSES,
  type AnnouncementCategory,
  type AnnouncementVisibility,
} from "@/types/communication";

export type CommunicationActionState = {
  error?: string;
  success?: string;
  id?: string;
  draftTitle?: string;
  draftBody?: string;
};

function parseEnum<T extends string>(raw: string, allowed: readonly T[]): T | null {
  return allowed.includes(raw as T) ? (raw as T) : null;
}

async function notifyAnnouncementRecipients(
  clubId: string,
  announcementId: string,
  title: string,
  body: string,
  category: AnnouncementCategory,
  visibility: AnnouncementVisibility,
  targetTeamId: string | null,
  targetRole: string | null,
) {
  const recipients = await getAnnouncementRecipientUserIds(clubId, {
    visibility,
    category,
    targetTeamId,
    targetRole,
  });

  await dispatchCommunicationNotifications(recipients, {
    clubId,
    userId: "",
    kind: "announcement",
    sourceId: announcementId,
    title,
    body: body.slice(0, 160),
    href: `/communication/announcements?id=${announcementId}`,
  });
}

export async function upsertAnnouncementAction(
  _prev: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  if (!canManageCommunication(access.roles) && !canPublishCommunication(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  const id = String(formData.get("id") ?? "").trim() || randomUUID();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = parseEnum(String(formData.get("category") ?? "club"), ANNOUNCEMENT_CATEGORIES);
  const priority = parseEnum(String(formData.get("priority") ?? "normal"), ANNOUNCEMENT_PRIORITIES);
  const visibility = parseEnum(String(formData.get("visibility") ?? "all"), ANNOUNCEMENT_VISIBILITIES);
  const status = parseEnum(String(formData.get("status") ?? "draft"), ANNOUNCEMENT_STATUSES) ?? "draft";
  const targetTeamId = String(formData.get("targetTeamId") ?? "").trim() || null;
  const targetRole = String(formData.get("targetRole") ?? "").trim() || null;
  const aiGenerated = formData.get("aiGenerated") === "on";

  if (!title) return { error: "Podaj tytuł ogłoszenia." };
  if (!category || !priority || !visibility) return { error: "Nieprawidłowe parametry." };
  if (status === "published" && !canPublishCommunication(access.roles)) {
    return { error: "Brak uprawnień do publikacji." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").upsert({
    id,
    club_id: access.clubId,
    title,
    body,
    category,
    priority,
    visibility,
    target_team_id: targetTeamId,
    target_role: targetRole as "owner" | null,
    status,
    created_by: access.userId,
    ai_generated: aiGenerated,
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  if (status === "published") {
    await notifyAnnouncementRecipients(
      access.clubId,
      id,
      title,
      body,
      category,
      visibility,
      targetTeamId,
      targetRole,
    );
  }

  await revalidateCommunicationPaths();
  return { success: "Ogłoszenie zapisane.", id };
}

export async function markAnnouncementReadAction(announcementId: string): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  const supabase = await createClient();
  const { error } = await supabase.from("announcement_reads").upsert({
    club_id: access.clubId,
    announcement_id: announcementId,
    user_id: access.userId,
    read_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  await revalidateCommunicationPaths();
  return { success: "Oznaczono jako przeczytane." };
}

export async function archiveAnnouncementAction(announcementId: string): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  if (!canManageCommunication(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", announcementId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  await revalidateCommunicationPaths();
  return { success: "Ogłoszenie zarchiwizowane." };
}

export async function upsertCoachMessageAction(
  _prev: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  if (!canCreateCommunication(access.roles)) return { error: "Brak uprawnień." };

  const id = String(formData.get("id") ?? "").trim() || randomUUID();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as "draft" | "published";
  const requiresAttendance = formData.get("requiresAttendance") === "on";
  const aiGenerated = formData.get("aiGenerated") === "on";

  if (!teamId || !title) return { error: "Wybierz drużynę i podaj tytuł." };

  const supabase = await createClient();
  const { error } = await supabase.from("coach_messages").upsert({
    id,
    club_id: access.clubId,
    team_id: teamId,
    title,
    body,
    status,
    requires_attendance: requiresAttendance,
    created_by: access.userId,
    ai_generated: aiGenerated,
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  if (status === "published") {
    const recipients = await getTeamMemberUserIds(access.clubId, teamId);
    await dispatchCommunicationNotifications(recipients, {
      clubId: access.clubId,
      userId: access.userId,
      kind: "coach_message",
      sourceId: id,
      title,
      body: body.slice(0, 160),
      href: `/communication/coach?id=${id}`,
    });
  }

  await revalidateCommunicationPaths();
  return { success: "Komunikat trenera zapisany.", id };
}

export async function respondCoachMessageAction(
  coachMessageId: string,
  responseRaw: string,
): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  const response = mapAttendanceResponse(responseRaw);
  if (!response || !ATTENDANCE_RESPONSES.includes(response)) {
    return { error: "Nieprawidłowa odpowiedź." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coach_message_responses").upsert({
    club_id: access.clubId,
    coach_message_id: coachMessageId,
    user_id: access.userId,
    response,
    responded_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  await revalidateCommunicationPaths();
  return { success: "Odpowiedź zapisana." };
}

export async function sendChatMessageAction(
  _prev: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  const chatId = String(formData.get("chatId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!chatId || !body) return { error: "Wiadomość nie może być pusta." };

  const isEmojiOnly = /^(\p{Extended_Pictographic}|\s)+$/u.test(body);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      club_id: access.clubId,
      chat_id: chatId,
      sender_id: access.userId,
      body,
      is_emoji_only: isEmojiOnly,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { data: chat } = await supabase
    .from("team_chats")
    .select("chat_type, team_id, sponsor_id")
    .eq("id", chatId)
    .maybeSingle();

  let recipients = chat
    ? await getChatNotificationRecipients(access.clubId, {
        chatType: String(chat.chat_type),
        teamId: chat.team_id ? String(chat.team_id) : null,
        sponsorId: chat.sponsor_id ? String(chat.sponsor_id) : null,
      })
    : [];
  recipients = recipients.filter((id) => id !== access.userId);

  if (recipients.length) {
    await dispatchCommunicationNotifications(recipients.slice(0, 50), {
      clubId: access.clubId,
      userId: access.userId,
      kind: "chat_message",
      sourceId: String(data.id),
      title: "Nowa wiadomość w czacie",
      body: body.slice(0, 120),
      href: `/communication/chats/${chatId}`,
    });
  }

  await revalidateCommunicationPaths();
  return { success: "Wiadomość wysłana." };
}

export async function generateCommunicationAiAction(
  _prev: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const access = await requireAccessContext();
  if (!canCreateCommunication(access.roles)) return { error: "Brak uprawnień." };

  const kind = String(formData.get("kind") ?? "announcement") as
    | "announcement"
    | "coach_message"
    | "reminder"
    | "style_fix";
  const prompt = String(formData.get("prompt") ?? "").trim();
  const existingText = String(formData.get("existingText") ?? "").trim() || undefined;
  const teamName = String(formData.get("teamName") ?? "").trim() || undefined;

  if (!prompt && kind !== "style_fix") return { error: "Podaj polecenie dla AI." };

  const supabase = await createClient();
  const { data: club } = await supabase.from("clubs").select("public_name").eq("id", access.clubId).maybeSingle();
  const clubName = club ? getClubBrandingName({ publicName: String(club.public_name) }) : "Klub";

  const draft = await generateCommunicationDraft({
    kind,
    clubName,
    teamName,
    prompt: prompt || "Popraw styl",
    existingText,
  });

  return {
    success: draft.aiUsed ? "Propozycja AI gotowa (nie wysłano)." : "Propozycja szablonu gotowa.",
    draftTitle: draft.title,
    draftBody: draft.body,
  };
}
