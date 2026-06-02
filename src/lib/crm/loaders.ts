import { cache } from "react";

import { mapCrmContact, mapCrmDonation, mapCrmEvent, mapCrmInteraction, mapCrmTask } from "@/lib/crm/mappers";
import { PIPELINE_KANBAN_ORDER } from "@/lib/crm/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  CrmContactRow,
  CrmDashboardStats,
  CrmDonationRow,
  CrmEventRow,
  CrmInteractionRow,
  CrmParentContext,
  CrmPipelineColumn,
  CrmTaskRow,
} from "@/types/crm";
import type { CrmContactType } from "@/types/crm";

export const getCrmDashboardStats = cache(async (clubId: string): Promise<CrmDashboardStats> => {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [sponsors, newContacts, tasks, donations, events] = await Promise.all([
    supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("pipeline_status", "active_sponsor")
      .eq("is_active", true),
    supabase
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("pipeline_status", "new_contact")
      .eq("is_active", true),
    supabase
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "open"),
    supabase.from("crm_donations").select("amount").eq("club_id", clubId),
    supabase
      .from("crm_events")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("starts_at", now),
  ]);

  const donationsTotal = (donations.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    activeSponsors: sponsors.count ?? 0,
    newContacts: newContacts.count ?? 0,
    openTasks: tasks.count ?? 0,
    donationsTotal,
    upcomingEvents: events.count ?? 0,
  };
});

export const getCrmContacts = cache(
  async (
    clubId: string,
    contactType?: CrmContactType,
    limit = 100,
    offset = 0,
  ): Promise<CrmContactRow[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("crm_contacts")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (contactType) query = query.eq("contact_type", contactType);
    const { data } = await query;
    return (data ?? []).map((row) => mapCrmContact(row as Record<string, unknown>));
  },
);

export const getCrmContactDetail = cache(
  async (
    clubId: string,
    contactId: string,
  ): Promise<{ contact: CrmContactRow; interactions: CrmInteractionRow[] } | null> => {
    const supabase = await createClient();
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("club_id", clubId)
      .eq("id", contactId)
      .maybeSingle();
    if (!contact) return null;

    const { data: interactions } = await supabase
      .from("crm_interactions")
      .select("*")
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false });

    return {
      contact: mapCrmContact(contact as Record<string, unknown>),
      interactions: (interactions ?? []).map((row) =>
        mapCrmInteraction(row as Record<string, unknown>),
      ),
    };
  },
);

export const getCrmPipeline = cache(async (clubId: string): Promise<CrmPipelineColumn[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .in("contact_type", ["sponsor", "donor", "company"])
    .order("updated_at", { ascending: false });

  const pipelineContacts = (data ?? []).map((row) => mapCrmContact(row as Record<string, unknown>));

  return PIPELINE_KANBAN_ORDER.map((status) => ({
    status,
    contacts: pipelineContacts.filter((c) => c.pipelineStatus === status),
  }));
});

export const getCrmTasks = cache(async (clubId: string): Promise<CrmTaskRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_tasks")
    .select("*")
    .eq("club_id", clubId)
    .order("due_at", { ascending: true, nullsFirst: false });

  return (data ?? []).map((row) => mapCrmTask(row as Record<string, unknown>));
});

export const getCrmEvents = cache(async (clubId: string): Promise<CrmEventRow[]> => {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("crm_events")
    .select("*")
    .eq("club_id", clubId)
    .order("starts_at", { ascending: false });

  const rows = events ?? [];
  const eventIds = rows.map((e) => String(e.id));
  const counts = new Map<string, number>();
  if (eventIds.length) {
    const { data: attendees } = await supabase
      .from("crm_event_attendees")
      .select("event_id")
      .in("event_id", eventIds);
    for (const id of eventIds) {
      counts.set(id, (attendees ?? []).filter((a) => String(a.event_id) === id).length);
    }
  }

  return rows.map((row) =>
    mapCrmEvent({
      ...(row as Record<string, unknown>),
      attendee_count: counts.get(String(row.id)) ?? 0,
    }),
  );
});

export const getCrmDonations = cache(async (clubId: string): Promise<CrmDonationRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_donations")
    .select("*")
    .eq("club_id", clubId)
    .order("donated_at", { ascending: false });

  return (data ?? []).map((row) => mapCrmDonation(row as Record<string, unknown>));
});

export const getCrmParentContext = cache(async (clubId: string, profileId: string): Promise<CrmParentContext> => {
  const supabase = await createClient();

  const { data: guardians } = await supabase
    .from("player_guardians")
    .select("player_id")
    .eq("club_id", clubId)
    .eq("profile_id", profileId);

  const playerIds = (guardians ?? []).map((g) => String(g.player_id));

  let contactRow = null;
  if (playerIds.length) {
    const { data } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("club_id", clubId)
      .eq("contact_type", "parent")
      .or(`profile_id.eq.${profileId},player_id.in.(${playerIds.join(",")})`)
      .maybeSingle();
    contactRow = data;
  } else {
    const { data } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("club_id", clubId)
      .eq("contact_type", "parent")
      .eq("profile_id", profileId)
      .maybeSingle();
    contactRow = data;
  }

  const children: CrmParentContext["children"] = [];
  if (playerIds.length) {
    const { data: players } = await supabase
      .from("players")
      .select("id, first_name, last_name, team_id, teams(name)")
      .eq("club_id", clubId)
      .in("id", playerIds);

    for (const player of players ?? []) {
      const teams = player.teams as { name?: string } | { name?: string }[] | null;
      const teamName = Array.isArray(teams) ? teams[0]?.name : teams?.name;
      children.push({
        id: String(player.id),
        name: `${player.first_name} ${player.last_name}`,
        teamName: teamName ?? null,
      });
    }
  }

  let recentCommunications = 0;
  if (playerIds.length) {
    const { count } = await supabase
      .from("coach_messages")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "published");
    recentCommunications = count ?? 0;
  }

  let present = 0;
  let total = 0;
  if (playerIds.length) {
    const { data: avail } = await supabase
      .from("player_availability")
      .select("status")
      .eq("club_id", clubId)
      .in("player_id", playerIds);
    total = avail?.length ?? 0;
    present = (avail ?? []).filter((a) => a.status === "present").length;
  }

  return {
    contact: contactRow ? mapCrmContact(contactRow as Record<string, unknown>) : null,
    children,
    recentCommunications,
    attendanceSummary: { present, total },
  };
});

export const getCrmPortalContact = cache(async (clubId: string, profileId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("club_id", clubId)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? mapCrmContact(data as Record<string, unknown>) : null;
});
