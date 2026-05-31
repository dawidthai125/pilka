import { notFound } from "next/navigation";

import { AiChatView } from "@/features/ai/components/ai-chat-view";
import { getAiConversationDetail, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";

export default async function AiChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const data = await getAiConversationDetail(id);
  if (!data) notFound();

  return <AiChatView data={data} />;
}
