"use server";

import { revalidatePath } from "next/cache";

import {
  canAccessAiReportCategory,
  canManageAi,
  canPublishAiReports,
  canUseAiChat,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { AI_MAX_MESSAGE_LENGTH } from "@/lib/ai/constants";
import { buildAiClubContext, serializeAiContext } from "@/lib/ai/context";
import { syncAiSuggestions } from "@/lib/ai/insights";
import { generateAiAnswer, generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";
import { createClient } from "@/lib/supabase/server";
import type { AiReportCategory, AiReportType } from "@/types/ai";

export type AiActionState = { error?: string; success?: string; id?: string };

function revalidateAiPaths() {
  revalidatePath("/ai");
  revalidatePath("/ai/chat");
  revalidatePath("/ai/reports");
  revalidatePath("/ai/suggestions");
}

async function verifyConversationOwned(
  conversationId: string,
  userId: string,
  clubId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

async function verifyReportInClub(reportId: string, clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_reports")
    .select("id, category, status")
    .eq("id", reportId)
    .eq("club_id", clubId)
    .maybeSingle();
  return data;
}

export async function createAiConversation(
  _prev: AiActionState,
  _formData: FormData,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      club_id: access.clubId,
      user_id: access.userId,
      title: "Nowa rozmowa",
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się utworzyć rozmowy." };
  revalidateAiPaths();
  return { success: "Rozmowa utworzona.", id: data.id };
}

export async function sendAiMessage(
  conversationId: string,
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Wpisz wiadomość." };
  if (content.length > AI_MAX_MESSAGE_LENGTH) {
    return { error: `Wiadomość może mieć maksymalnie ${AI_MAX_MESSAGE_LENGTH} znaków.` };
  }
  if (!(await verifyConversationOwned(conversationId, access.userId, access.clubId))) {
    return { error: "Rozmowa nie istnieje." };
  }

  const supabase = await createClient();

  const { error: userError } = await supabase.from("ai_messages").insert({
    club_id: access.clubId,
    conversation_id: conversationId,
    role: "user",
    content,
  });
  if (userError) return { error: userError.message };

  const { data: historyRows } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .eq("club_id", access.clubId)
    .order("created_at")
    .limit(20);

  const history = (historyRows ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, -1)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let assistantContent: string;
  try {
    const ctxObj = await buildAiClubContext(access.clubId);
    if (!isOpenAiConfigured()) {
      assistantContent =
        "OpenAI nie jest skonfigurowane (brak OPENAI_API_KEY). " +
        "Na podstawie danych systemowych: frekwencja ~" +
        `${ctxObj.trainings.avgAttendanceRate}%, forma (5 meczów): ${ctxObj.matches.teamFormLast5}, kontuzje: ${ctxObj.players.injured}.`;
    } else {
      assistantContent = await generateAiAnswer(
        content,
        ctxObj.clubName,
        serializeAiContext(ctxObj),
        history,
      );
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd AI." };
  }

  const { error: assistantError } = await supabase.from("ai_messages").insert({
    club_id: access.clubId,
    conversation_id: conversationId,
    role: "assistant",
    content: assistantContent,
  });
  if (assistantError) return { error: assistantError.message };

  const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
  await supabase
    .from("ai_conversations")
    .update({ title })
    .eq("id", conversationId)
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId);

  revalidateAiPaths();
  revalidatePath(`/ai/chat/${conversationId}`);
  return { success: "Wysłano." };
}

export async function toggleAiConversationPin(
  conversationId: string,
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };
  if (!(await verifyConversationOwned(conversationId, access.userId, access.clubId))) {
    return { error: "Rozmowa nie istnieje." };
  }

  const pinned = formData.get("pinned") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .update({ is_pinned: pinned })
    .eq("id", conversationId)
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId);

  if (error) return { error: error.message };
  revalidateAiPaths();
  return { success: pinned ? "Przypięto." : "Odpięto." };
}

export async function updateAiReport(
  reportId: string,
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  const report = await verifyReportInClub(reportId, access.clubId);
  if (!report) return { error: "Raport nie istnieje." };
  if (report.status !== "draft") {
    return { error: "Opublikowany raport nie może być edytowany." };
  }
  if (!canAccessAiReportCategory(access.roles, report.category)) {
    return { error: "Brak uprawnień do tej kategorii." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return { error: "Wypełnij tytuł i treść." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_reports")
    .update({ title, content })
    .eq("id", reportId)
    .eq("club_id", access.clubId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidateAiPaths();
  revalidatePath(`/ai/reports/${reportId}`);
  return { success: "Raport zapisany." };
}

export async function publishAiReport(
  reportId: string,
  _prev: AiActionState,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canPublishAiReports(access.roles)) return { error: "Brak uprawnień." };

  const report = await verifyReportInClub(reportId, access.clubId);
  if (!report) return { error: "Raport nie istnieje." };
  if (!canAccessAiReportCategory(access.roles, report.category)) {
    return { error: "Brak uprawnień do tej kategorii." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_reports")
    .update({
      status: "published",
      reviewed_by: access.userId,
      published_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateAiPaths();
  revalidatePath(`/ai/reports/${reportId}`);
  return { success: "Raport opublikowany." };
}

async function saveGeneratedReport(input: {
  clubId: string;
  category: AiReportCategory;
  reportType: AiReportType;
  title: string;
  content: string;
  sourceType?: string;
  sourceId?: string;
  createdBy: string;
}) {
  const supabase = await createClient();
  return supabase
    .from("ai_reports")
    .insert({
      club_id: input.clubId,
      category: input.category,
      report_type: input.reportType,
      title: input.title,
      content: input.content,
      status: "draft",
      metadata: { generatedBy: "ai" },
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      created_by: input.createdBy,
    })
    .select("id")
    .single();
}

export async function generateAiMatchReport(
  matchId: string,
  _prev: AiActionState,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canAccessAiReportCategory(access.roles, "matches")) {
    return { error: "Brak uprawnień." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("home_team_name, away_team_name, home_score, away_score, match_date, status")
    .eq("id", matchId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!match || match.status !== "completed") {
    return { error: "Mecz musi być zakończony." };
  }

  const ctxObj = await buildAiClubContext(access.clubId);
  const instruction =
    `Wygeneruj raport meczowy AI po meczu ${match.home_team_name} ${match.home_score}:${match.away_score} ${match.away_team_name} (${match.match_date}). ` +
    "Sekcje: Podsumowanie, Najważniejsze wydarzenia, Wyróżnieni zawodnicy, Mocne strony, Słabe strony. Markdown.";

  let content: string;
  try {
    content = isOpenAiConfigured()
      ? await generateAiReportContent(instruction, ctxObj.clubName, serializeAiContext(ctxObj))
      : `## Podsumowanie\n\nMecz ${match.home_team_name} — ${match.away_team_name}: ${match.home_score}:${match.away_score}.\n\n## Najważniejsze wydarzenia\n\n(Dane z systemu — skonfiguruj OPENAI_API_KEY dla pełnej analizy AI.)`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd generowania." };
  }

  const { data, error } = await saveGeneratedReport({
    clubId: access.clubId,
    category: "matches",
    reportType: "match_summary",
    title: `Raport meczowy AI — ${match.home_team_name} vs ${match.away_team_name}`,
    content,
    sourceType: "match",
    sourceId: matchId,
    createdBy: access.userId,
  });

  if (error || !data) return { error: error?.message ?? "Błąd zapisu." };
  revalidateAiPaths();
  return { success: "Raport meczowy wygenerowany.", id: data.id };
}

export async function generateAiTrainingReport(_prev: AiActionState): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canAccessAiReportCategory(access.roles, "trainings")) {
    return { error: "Brak uprawnień." };
  }

  const ctxObj = await buildAiClubContext(access.clubId);
  const instruction =
    "Wygeneruj raport treningowy AI — podsumowanie tygodnia: frekwencja, aktywność zawodników, nieobecności. Markdown.";

  let content: string;
  try {
    content = isOpenAiConfigured()
      ? await generateAiReportContent(instruction, ctxObj.clubName, serializeAiContext(ctxObj))
      : `## Frekwencja\n\nŚrednia frekwencja: ${ctxObj.trainings.avgAttendanceRate}%.\n\n## Nieobecności\n\nBrak odpowiedzi: ${ctxObj.trainings.missingAvailabilityCount} zawodników.`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd generowania." };
  }

  const { data, error } = await saveGeneratedReport({
    clubId: access.clubId,
    category: "trainings",
    reportType: "training_weekly",
    title: "Raport treningowy AI — podsumowanie tygodnia",
    content,
    sourceType: "week",
    createdBy: access.userId,
  });

  if (error || !data) return { error: error?.message ?? "Błąd zapisu." };
  revalidateAiPaths();
  return { success: "Raport treningowy wygenerowany.", id: data.id };
}

export async function generateAiManagementReport(_prev: AiActionState): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canManageAi(access.roles)) return { error: "Brak uprawnień." };

  const ctxObj = await buildAiClubContext(access.clubId);
  const month = new Date().toISOString().slice(0, 7);
  const instruction =
    `Wygeneruj miesięczny raport zarządu AI za ${month}: liczba treningów, meczów, średnia frekwencja, aktywność, wydarzenia. Markdown.`;

  let content: string;
  try {
    content = isOpenAiConfigured()
      ? await generateAiReportContent(instruction, ctxObj.clubName, serializeAiContext(ctxObj))
      : `## Raport zarządu — ${month}\n\n- Mecze rozegrane: ${ctxObj.matches.completedCount}\n- Średnia frekwencja: ${ctxObj.trainings.avgAttendanceRate}%\n- Kontuzje: ${ctxObj.players.injured}`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd generowania." };
  }

  const { data, error } = await saveGeneratedReport({
    clubId: access.clubId,
    category: "management",
    reportType: "management_monthly",
    title: `Raport zarządu AI — ${month}`,
    content,
    sourceType: "month",
    createdBy: access.userId,
  });

  if (error || !data) return { error: error?.message ?? "Błąd zapisu." };
  revalidateAiPaths();
  return { success: "Raport zarządu wygenerowany.", id: data.id };
}

export async function generateAiSocialPosts(
  matchId: string,
  _prev: AiActionState,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canAccessAiReportCategory(access.roles, "matches")) {
    return { error: "Brak uprawnień." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("home_team_name, away_team_name, home_score, away_score, round_number, status")
    .eq("id", matchId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!match || match.status !== "completed") {
    return { error: "Mecz musi być zakończony." };
  }

  const ctxObj = await buildAiClubContext(access.clubId);
  const base = `${match.home_team_name} ${match.home_score}:${match.away_score} ${match.away_team_name}`;

  let facebookContent = `⚽ ${base} — dziękujemy kibicom!`;
  if (isOpenAiConfigured()) {
    try {
      facebookContent = await generateAiReportContent(
        `Napisz post na Facebooka po meczu: ${base}. Max 280 znaków, emoji.`,
        ctxObj.clubName,
        serializeAiContext(ctxObj),
      );
    } catch {
      /* fallback */
    }
  }

  const posts: Array<{ reportType: AiReportType; title: string; content: string }> = [
    { reportType: "social_facebook", title: "Post Facebook — wynik meczu", content: facebookContent },
    {
      reportType: "social_instagram",
      title: "Post Instagram — wynik meczu",
      content: `⚡ ${base}\n#Klub #Piłka`,
    },
    {
      reportType: "social_website",
      title: "Komunikat strona klubowa",
      content: `Wynik meczu ligowego: ${base}.`,
    },
    {
      reportType: "social_round",
      title: `Podsumowanie kolejki ${match.round_number ?? ""}`.trim(),
      content: `Kolejka ${match.round_number ?? "—"}: ${base}.`,
    },
  ];

  for (const post of posts) {
    await saveGeneratedReport({
      clubId: access.clubId,
      category: "matches",
      reportType: post.reportType,
      title: post.title,
      content: post.content,
      sourceType: "match",
      sourceId: matchId,
      createdBy: access.userId,
    });
  }

  revalidateAiPaths();
  return { success: "Posty social media wygenerowane (szkice)." };
}

export async function dismissAiSuggestion(
  suggestionId: string,
  _prev: AiActionState,
): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_suggestions")
    .update({ status: "dismissed" })
    .eq("id", suggestionId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateAiPaths();
  return { success: "Sugestia zamknięta." };
}

export async function refreshAiSuggestions(_prev: AiActionState): Promise<AiActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  const count = await syncAiSuggestions(access.clubId);
  revalidateAiPaths();
  return { success: `Zaktualizowano sugestie (${count} nowych).` };
}
