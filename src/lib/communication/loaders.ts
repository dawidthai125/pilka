import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { mapAnnouncement, mapChatMessage, mapCoachMessage, mapTeamChat } from "@/lib/communication/mappers";
import type {
  Announcement,
  ChatMessage,
  CoachMessage,
  CommunicationDashboardStats,
  CommunicationFilters,
  TeamChat,
} from "@/types/communication";

export const getCommunicationDashboardStats = cache(
  async (clubId: string, userId: string): Promise<CommunicationDashboardStats> => {
    const supabase = await createClient();

    const [annRes, coachRes, chatsRes, notifRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "published"),
      supabase
        .from("coach_messages")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "published")
        .gte("published_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase
        .from("team_chats")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("is_active", true),
      supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("club_id", clubId)
        .eq("user_id", userId),
    ]);

    const { data: published } = await supabase
      .from("announcements")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "published");

    const readIds = new Set((notifRes.data ?? []).map((r) => String(r.announcement_id)));
    const unread = (published ?? []).filter((a) => !readIds.has(String(a.id))).length;

    return {
      publishedAnnouncements: annRes.count ?? 0,
      unreadAnnouncements: unread,
      coachMessagesWeek: coachRes.count ?? 0,
      activeChats: chatsRes.count ?? 0,
      pendingNotifications: unread,
    };
  },
);

export const getAnnouncements = cache(
  async (
    clubId: string,
    userId: string,
    filters?: CommunicationFilters,
  ): Promise<Announcement[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("announcements")
      .select("*")
      .eq("club_id", clubId)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (filters?.teamId) query = query.eq("target_team_id", filters.teamId);
    if (filters?.authorId) query = query.eq("created_by", filters.authorId);
    if (filters?.priority) query = query.eq("priority", filters.priority);
    if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((r) => String(r.id));
    const { data: reads } = ids.length
      ? await supabase.from("announcement_reads").select("announcement_id, user_id").in("announcement_id", ids)
      : { data: [] };

    const readByAnnouncement = new Map<string, number>();
    const userRead = new Set<string>();
    for (const r of reads ?? []) {
      const aid = String(r.announcement_id);
      readByAnnouncement.set(aid, (readByAnnouncement.get(aid) ?? 0) + 1);
      if (String(r.user_id) === userId) userRead.add(aid);
    }

    let items = (data ?? []).map((row) =>
      mapAnnouncement({
        ...row,
        read_count: readByAnnouncement.get(String(row.id)) ?? 0,
        is_read: userRead.has(String(row.id)),
      }),
    );

    if (filters?.readStatus === "read") items = items.filter((a) => a.isRead);
    if (filters?.readStatus === "unread") items = items.filter((a) => !a.isRead);

    return items;
  },
);

export const getAnnouncementReadStats = cache(async (announcementId: string) => {
  const supabase = await createClient();
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("user_id, read_at, profiles(full_name)")
    .eq("announcement_id", announcementId);

  return (reads ?? []).map((r) => ({
    userId: String(r.user_id),
    readAt: String(r.read_at),
    fullName: (r.profiles as { full_name?: string } | null)?.full_name ?? "Użytkownik",
  }));
});

export const getCoachMessages = cache(
  async (clubId: string, userId: string, teamId?: string): Promise<CoachMessage[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("coach_messages")
      .select("*, teams(name)")
      .eq("club_id", clubId)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query.limit(50);
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((r) => String(r.id));
    const { data: responses } = ids.length
      ? await supabase
          .from("coach_message_responses")
          .select("coach_message_id, response, user_id")
          .in("coach_message_id", ids)
      : { data: [] };

    const summary = new Map<string, { yes: number; no: number; unknown: number }>();
    const userResponses = new Map<string, string>();
    for (const r of responses ?? []) {
      const mid = String(r.coach_message_id);
      const cur = summary.get(mid) ?? { yes: 0, no: 0, unknown: 0 };
      if (r.response === "yes") cur.yes += 1;
      else if (r.response === "no") cur.no += 1;
      else cur.unknown += 1;
      summary.set(mid, cur);
      if (String(r.user_id) === userId) userResponses.set(mid, String(r.response));
    }

    return (data ?? []).map((row) => {
      const team = row.teams as { name?: string } | null;
      const s = summary.get(String(row.id));
      const base = mapCoachMessage(row, team?.name);
      return {
        ...base,
        attendanceSummary: s
          ? { ...s, total: s.yes + s.no + s.unknown }
          : undefined,
        userResponse: (userResponses.get(String(row.id)) ?? null) as CoachMessage["userResponse"],
      };
    });
  },
);

export const getTeamChats = cache(async (clubId: string): Promise<TeamChat[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_chats")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTeamChat);
});

export const getChatMessages = cache(async (chatId: string, limit = 80): Promise<ChatMessage[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, profiles(full_name)")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as { full_name?: string } | null;
    return mapChatMessage(row, profile?.full_name ?? undefined);
  });
});

export const getTeamsForCommunication = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id, name, category")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    category: String(t.category),
  }));
});
