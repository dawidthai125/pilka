import { ContentAiGeneratorForm } from "@/features/content/components/content-ai-generator-form";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { canCreateContent } from "@/config/permissions";
import { redirect } from "next/navigation";

export default async function ContentAiPage() {
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);
  if (!canCreateContent(access.roles)) redirect("/content");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Generator AI</h1>
      <ContentAiGeneratorForm />
    </div>
  );
}
