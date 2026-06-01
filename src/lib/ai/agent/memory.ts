import { createClient } from "@/lib/supabase/server";

const MAX_SUMMARY_LENGTH = 500;

export async function getAgentMemory(
  clubId: string,
  userId: string,
  conversationId?: string | null,
): Promise<string> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_memory")
    .select("summary")
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  } else {
    query = query.is("conversation_id", null);
  }

  const { data } = await query.maybeSingle();
  return data?.summary ?? "";
}

export async function updateAgentMemory(
  clubId: string,
  userId: string,
  command: string,
  resultSummary: string,
  conversationId?: string | null,
): Promise<void> {
  const supabase = await createClient();
  const snippet = `Polecenie: ${command.slice(0, 120)}. Wynik: ${resultSummary.slice(0, 120)}.`;
  const existing = await getAgentMemory(clubId, userId, conversationId);
  const combined = `${existing} ${snippet}`.trim().slice(-MAX_SUMMARY_LENGTH);

  const { data: row } = conversationId
    ? await supabase
        .from("ai_memory")
        .select("id, message_count")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .eq("conversation_id", conversationId)
        .maybeSingle()
    : await supabase
        .from("ai_memory")
        .select("id, message_count")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .is("conversation_id", null)
        .maybeSingle();

  if (row) {
    await supabase
      .from("ai_memory")
      .update({ summary: combined, message_count: row.message_count + 1 })
      .eq("id", row.id);
  } else {
    await supabase.from("ai_memory").insert({
      club_id: clubId,
      user_id: userId,
      conversation_id: conversationId ?? null,
      summary: combined,
      message_count: 1,
    });
  }
}
