import { createMatch } from "@/features/matches/actions";
import { createTraining } from "@/features/training/actions";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";
import { buildAiClubContext, serializeAiContext } from "@/lib/ai/context";
import { getClubBrandingName } from "@/lib/club/names";
import { getClub } from "@/lib/auth/session";
import { DEFAULT_SEASON } from "@/lib/matches/constants";
import { createClient } from "@/lib/supabase/server";
import { resolveDefaultTeamId } from "@/lib/ai/agent/tools/read";
import type { UserAccessContext } from "@/types/rbac";
import type { AiToolName } from "@/types/ai-agent";

function buildFormData(entries: Record<string, string | undefined>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== "") formData.set(key, value);
  }
  return formData;
}

function safeNotificationHref(href: unknown): string {
  const raw = href ? String(href).trim() : "/training";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/training";
  }
  return raw.slice(0, 500);
}

const STAFF_NOTIFICATION_ROLES = ["owner", "president", "sports_director", "coach"] as const;

export async function executeWriteTool(
  toolName: AiToolName,
  input: Record<string, unknown>,
  access: UserAccessContext,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const clubId = access.clubId;

  switch (toolName) {
    case "createTraining": {
      const teamId = String(input.teamId ?? (await resolveDefaultTeamId(clubId)) ?? "");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().slice(0, 10);

      const formData = buildFormData({
        name: String(input.name ?? "Trening"),
        teamId,
        trainingDate: String(input.trainingDate ?? defaultDate),
        startTime: String(input.startTime ?? "18:00"),
        endTime: String(input.endTime ?? "19:30"),
        location: String(input.location ?? "Boisko klubowe"),
        description: input.description ? String(input.description) : undefined,
        status: "planned",
      });

      const result = await createTraining({}, formData);
      if (result.error) return { ok: false, error: result.error };
      return { ok: true, data: { trainingId: result.trainingId, message: result.success } };
    }
    case "createMatch": {
      const club = await getClub(clubId);
      const clubName = club ? getClubBrandingName(club) : "Klub";
      const teamId = String(input.teamId ?? (await resolveDefaultTeamId(clubId)) ?? "");

      const formData = buildFormData({
        teamId,
        competition: String(input.competition ?? "IV Liga"),
        season: String(input.season ?? DEFAULT_SEASON),
        matchDate: String(input.matchDate ?? new Date().toISOString().slice(0, 10)),
        matchTime: String(input.matchTime ?? "16:00"),
        homeTeamName: String(input.homeTeamName ?? clubName),
        awayTeamName: String(input.awayTeamName ?? "Przeciwnik"),
        status: "planned",
        stadium: input.stadium ? String(input.stadium) : undefined,
      });

      const result = await createMatch({}, formData);
      if (result.error) return { ok: false, error: result.error };
      return { ok: true, data: { matchId: result.matchId, message: result.success } };
    }
    case "createNotification": {
      const supabase = await createClient();
      const title = String(input.title ?? "Przypomnienie od AI Club Manager");
      const body = String(input.body ?? input.message ?? "Sprawdź szczegóły w aplikacji.");
      const href = safeNotificationHref(input.href);

      const { data: memberships } = await supabase
        .from("club_memberships")
        .select("user_id")
        .eq("club_id", clubId)
        .eq("status", "active")
        .in("role", [...STAFF_NOTIFICATION_ROLES]);

      const rows = (memberships ?? []).map((m) => ({
        club_id: clubId,
        user_id: m.user_id,
        title,
        body,
        href,
        scheduled_at: new Date().toISOString(),
      }));

      if (rows.length === 0) return { ok: false, error: "Brak odbiorców powiadomienia." };

      const { error } = await supabase.from("club_notifications").insert(rows);
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: { recipients: rows.length, title } };
    }
    case "generateReport": {
      const ctx = await buildAiClubContext(access);
      const category = String(input.category ?? "management");
      const instruction = String(
        input.instruction ?? `Wygeneruj raport kategorii ${category} dla zarządu klubu.`,
      );
      let content: string;
      if (isOpenAiConfigured()) {
        content = await generateAiReportContent(instruction, ctx.clubName, serializeAiContext(ctx));
      } else {
        content = `Raport ${category} — ${ctx.clubName}\n\nFrekwencja: ${ctx.trainings.avgAttendanceRate}%\nForma: ${ctx.matches.teamFormLast5}\nKontuzje: ${ctx.players.injured}`;
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("ai_reports")
        .insert({
          club_id: clubId,
          category: category === "matches" ? "matches" : category === "trainings" ? "trainings" : "management",
          report_type: category === "matches" ? "match_summary" : category === "trainings" ? "training_weekly" : "management_monthly",
          title: String(input.title ?? `Raport AI — ${category}`),
          content,
          status: "draft",
          created_by: access.userId,
          metadata: { source: "ai_club_manager" },
        })
        .select("id")
        .single();

      if (error) return { ok: false, error: error.message };
      return { ok: true, data: { reportId: data.id, title: input.title } };
    }
    case "generateNews": {
      const ctx = await buildAiClubContext(access);
      const topic = String(input.topic ?? "Podsumowanie tygodnia klubu");
      let content: string;
      if (isOpenAiConfigured()) {
        content = await generateAiReportContent(
          `Przygotuj krótką aktualność na stronę klubu: ${topic}`,
          ctx.clubName,
          serializeAiContext(ctx),
        );
      } else {
        content = `${topic} — ${ctx.clubName}. Forma drużyny: ${ctx.matches.teamFormLast5}.`;
      }
      return {
        ok: true,
        data: {
          draft: content,
          hint: "Treść gotowa do wklejenia w module Strona klubu → Aktualności.",
        },
      };
    }
    default:
      return { ok: false, error: `Nieobsługiwane narzędzie zapisu: ${toolName}` };
  }
}

export function buildActionPreview(
  toolName: AiToolName,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (toolName) {
    case "createTraining":
      return {
        title: input.name ?? "Trening",
        date: input.trainingDate,
        time: `${input.startTime ?? "18:00"}–${input.endTime ?? "19:30"}`,
        location: input.location,
      };
    case "createMatch":
      return {
        date: input.matchDate,
        time: input.matchTime,
        home: input.homeTeamName,
        away: input.awayTeamName,
      };
    case "createNotification":
      return { title: input.title, body: input.body ?? input.message, href: safeNotificationHref(input.href) };
    case "generateReport":
      return { category: input.category, title: input.title };
    case "generateNews":
      return { topic: input.topic };
    default:
      return input;
  }
}
