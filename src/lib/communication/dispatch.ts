import { createAdminClient } from "@/lib/supabase/admin";
import type { ClubRole } from "@/types/rbac";
import type {
  AnnouncementCategory,
  AnnouncementVisibility,
  CommunicationNotificationKind,
} from "@/types/communication";

type DispatchInput = {
  clubId: string;
  userId: string;
  kind: CommunicationNotificationKind;
  sourceId: string;
  title: string;
  body: string;
  href?: string;
};

type ChatTarget = {
  chatType: string;
  teamId: string | null;
  sponsorId: string | null;
};

type AnnouncementTarget = {
  visibility: AnnouncementVisibility;
  category: AnnouncementCategory;
  targetTeamId: string | null;
  targetRole: string | null;
};

function eventTypeForKind(kind: CommunicationNotificationKind): string {
  switch (kind) {
    case "announcement":
      return "club_announcement";
    case "coach_message":
      return "coach_message_new";
    case "chat_message":
      return "chat_message_new";
    case "training_change":
      return "schedule_change";
    case "match_change":
      return "match_tomorrow";
    default:
      return "general";
  }
}

/** Enqueue in-app + push notifications for communication events. */
export async function dispatchCommunicationNotifications(
  recipients: string[],
  input: DispatchInput,
): Promise<void> {
  const unique = [...new Set(recipients.filter(Boolean))];
  if (!unique.length) return;

  const admin = createAdminClient();
  const eventType = eventTypeForKind(input.kind);
  const href = input.href ?? "/communication";

  for (const userId of unique) {
    await admin.from("club_notifications").insert({
      club_id: input.clubId,
      user_id: userId,
      title: input.title,
      body: input.body,
      href,
      delivery_channels: ["in_app"],
      scheduled_at: new Date().toISOString(),
    });

    await admin.from("notification_queue").insert({
      club_id: input.clubId,
      user_id: userId,
      event_type: eventType as "general",
      title: input.title,
      body: input.body,
      href,
      payload: { kind: input.kind, sourceId: input.sourceId },
      status: "pending",
    });

    await admin.from("notification_events").insert({
      club_id: input.clubId,
      user_id: userId,
      kind: input.kind,
      source_id: input.sourceId,
      title: input.title,
      body: input.body,
      href,
      push_queued: true,
      in_app_created: true,
    });
  }
}

const BOARD_ROLES = ["owner", "president", "sports_director", "treasurer"] as const;

/** Active member user ids for club-wide broadcast (excludes sponsors unless targeted). */
export async function getClubMemberUserIds(clubId: string, excludeSponsors = true): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_memberships")
    .select("user_id, role")
    .eq("club_id", clubId)
    .eq("status", "active");

  return (data ?? [])
    .filter((m) => !excludeSponsors || m.role !== "sponsor")
    .map((m) => String(m.user_id));
}

export async function getBoardMemberUserIds(clubId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_memberships")
    .select("user_id, role")
    .eq("club_id", clubId)
    .eq("status", "active");

  return (data ?? [])
    .filter((m) => BOARD_ROLES.includes(m.role as (typeof BOARD_ROLES)[number]))
    .map((m) => String(m.user_id));
}

export async function getRoleMemberUserIds(clubId: string, role: ClubRole): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .eq("role", role);

  return (data ?? []).map((m) => String(m.user_id));
}

export async function getSponsorUserIds(clubId: string): Promise<string[]> {
  return getRoleMemberUserIds(clubId, "sponsor");
}

export async function getSponsorChatUserIds(clubId: string, sponsorId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sponsors")
    .select("profile_id")
    .eq("club_id", clubId)
    .eq("id", sponsorId)
    .maybeSingle();

  return data?.profile_id ? [String(data.profile_id)] : [];
}

export async function getTeamMemberUserIds(clubId: string, teamId: string): Promise<string[]> {
  const admin = createAdminClient();
  const ids = new Set<string>();

  const { data: memberships } = await admin
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .eq("team_id", teamId);

  for (const m of memberships ?? []) ids.add(String(m.user_id));

  const { data: guardians, error: guardiansError } = await admin
    .from("player_guardians")
    .select("profile_id, players!inner(team_id)")
    .eq("club_id", clubId);

  if (!guardiansError) {
    for (const g of guardians ?? []) {
      const player = g.players as { team_id?: string } | null;
      if (player?.team_id === teamId) ids.add(String(g.profile_id));
    }
  }

  return [...ids];
}

export async function getAnnouncementRecipientUserIds(
  clubId: string,
  target: AnnouncementTarget,
): Promise<string[]> {
  if (target.visibility === "team" && target.targetTeamId) {
    return getTeamMemberUserIds(clubId, target.targetTeamId);
  }

  if (target.category === "sponsors") {
    return getSponsorUserIds(clubId);
  }

  if (target.category === "board") {
    return getBoardMemberUserIds(clubId);
  }

  if (target.visibility === "role" && target.targetRole) {
    return getRoleMemberUserIds(clubId, target.targetRole as ClubRole);
  }

  return getClubMemberUserIds(clubId, true);
}

export async function getChatNotificationRecipients(clubId: string, chat: ChatTarget): Promise<string[]> {
  if (chat.chatType === "team" && chat.teamId) {
    return getTeamMemberUserIds(clubId, chat.teamId);
  }

  if (chat.chatType === "board") {
    return getBoardMemberUserIds(clubId);
  }

  if (chat.chatType === "sponsor" && chat.sponsorId) {
    return getSponsorChatUserIds(clubId, chat.sponsorId);
  }

  return [];
}
