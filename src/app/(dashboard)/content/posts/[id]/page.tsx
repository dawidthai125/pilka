import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentPostDetailView } from "@/features/content/components/content-post-detail-view";
import { canManageContent, canPublishContent } from "@/config/permissions";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { getContentPostBundle } from "@/lib/content/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ContentPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);

  const bundle = await getContentPostBundle(access.clubId, id);
  if (!bundle.post) notFound();

  return (
    <div className="space-y-4">
      <Link href="/content/posts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        ← Materiały
      </Link>
      <ContentPostDetailView
        post={bundle.post}
        variants={bundle.variants}
        approvals={bundle.approvals}
        canManage={canManageContent(access.roles)}
        canPublish={canPublishContent(access.roles)}
      />
    </div>
  );
}
