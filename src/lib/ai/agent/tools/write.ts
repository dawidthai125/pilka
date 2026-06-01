import { createMatch } from "@/features/matches/actions";
import { createTraining } from "@/features/training/actions";
import { canPublishContent } from "@/config/permissions";
import { createContentPostFromAi } from "@/lib/content/create-from-ai";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";
import { generateVideoAnalysisReport } from "@/lib/video/processing";
import { getClubNameForVideo } from "@/lib/video/loaders";
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
    case "analyzeVideo": {
      const videoId = String(input.videoId ?? "");
      const supabase = await createClient();
      const baseQuery = supabase.from("videos").select("*").eq("club_id", clubId);
      const { data: videoRow } = videoId
        ? await baseQuery.eq("id", videoId).maybeSingle()
        : await baseQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!videoRow) return { ok: false, error: "Brak nagrania do analizy." };

      const clubName = await getClubNameForVideo(clubId);
      const report = await generateVideoAnalysisReport(
        {
          title: String(videoRow.title),
          category: videoRow.category as "match" | "training" | "opponent_analysis" | "educational",
          description: (videoRow.description as string | null) ?? null,
          opponentName: (videoRow.opponent_name as string | null) ?? null,
        },
        clubName,
      );

      const { data, error } = await supabase
        .from("video_reports")
        .insert({
          club_id: clubId,
          video_id: String(videoRow.id),
          report_type: report.reportType,
          title: report.title,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          key_moments: report.keyMoments,
          coaching_recommendations: report.coachingRecommendations,
          extra_sections: report.extraSections,
          generated_by_ai: true,
          created_by: access.userId,
        })
        .select("id")
        .single();

      if (error) return { ok: false, error: error.message };
      await supabase.from("videos").update({ job_status: "ready" }).eq("id", String(videoRow.id));
      return { ok: true, data: { reportId: data.id, videoId: videoRow.id, title: report.title } };
    }
    case "generateVideoSummary": {
      const supabase = await createClient();
      const videoId = String(input.videoId ?? "");
      const { data: report } = videoId
        ? await supabase
            .from("video_reports")
            .select("summary, coaching_recommendations, title")
            .eq("club_id", clubId)
            .eq("video_id", videoId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : await supabase
            .from("video_reports")
            .select("summary, coaching_recommendations, title")
            .eq("club_id", clubId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

      if (!report) return { ok: false, error: "Brak raportu wideo — najpierw uruchom analizę." };

      const recommendations = Array.isArray(report.coaching_recommendations)
        ? (report.coaching_recommendations as string[])
        : [];
      const summary = [
        `# ${report.title}`,
        "",
        String(report.summary ?? ""),
        "",
        "## Wskazówki dla zawodników",
        ...recommendations.map((r) => `- ${r}`),
      ].join("\n");

      return { ok: true, data: { summary, forPlayers: true } };
    }
    case "generateContentPost": {
      const prompt = String(input.prompt ?? input.topic ?? input.command ?? "").trim();
      if (!prompt) return { ok: false, error: "Podaj temat materiału." };

      try {
        const result = await createContentPostFromAi({
          clubId,
          userId: access.userId,
          prompt,
          matchId: input.matchId ? String(input.matchId) : null,
          videoId: input.videoId ? String(input.videoId) : null,
          sponsorId: input.sponsorId ? String(input.sponsorId) : null,
          canPublish: canPublishContent(access.roles),
          source: "agent",
        });
        const status = canPublishContent(access.roles) ? "draft" : "pending_approval";
        return { ok: true, data: { postId: result.postId, title: result.title, status } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Błąd generowania." };
      }
    }
    case "proposeContentPublication": {
      const postId = String(input.postId ?? "");
      if (!postId) return { ok: false, error: "Brak identyfikatora materiału." };

      const supabase = await createClient();
      const { data: existing } = await supabase
        .from("content_posts")
        .select("status")
        .eq("id", postId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (!existing) return { ok: false, error: "Nie znaleziono materiału." };
      if (existing.status === "published") {
        return { ok: false, error: "Materiał jest już opublikowany." };
      }

      const scheduledAt = input.scheduledAt ? String(input.scheduledAt) : null;

      const { error } = await supabase
        .from("content_posts")
        .update({
          status: "pending_approval",
          scheduled_at: scheduledAt,
        })
        .eq("id", postId)
        .eq("club_id", clubId);

      if (error) return { ok: false, error: error.message };

      await supabase.from("content_approvals").insert({
        club_id: clubId,
        post_id: postId,
        action: "submitted",
        actor_id: access.userId,
        note: "Propozycja publikacji z agenta AI — wymaga zatwierdzenia człowieka.",
      });

      if (scheduledAt) {
        await supabase.from("content_calendar").delete().eq("post_id", postId).eq("club_id", clubId);
        await supabase.from("content_calendar").insert({
          post_id: postId,
          club_id: clubId,
          scheduled_at: scheduledAt,
          all_day: false,
        });
      }

      return {
        ok: true,
        data: {
          postId,
          message: "Materiał oczekuje na zatwierdzenie — agent nie publikuje automatycznie.",
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
    case "analyzeVideo":
      return { videoId: input.videoId ?? "najnowsze nagranie" };
    case "generateVideoSummary":
      return { videoId: input.videoId ?? "ostatni raport" };
    case "generateContentPost":
      return { prompt: input.prompt ?? input.topic ?? "materiał Content Hub" };
    case "proposeContentPublication":
      return { postId: input.postId, scheduledAt: input.scheduledAt };
    default:
      return input;
  }
}
