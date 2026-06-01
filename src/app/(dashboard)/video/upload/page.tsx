import Link from "next/link";

import { VideoUploadForm } from "@/features/video/components/video-upload-form";
import { getDashboardContext, requireVideoReadAccess } from "@/lib/auth/session";
import { canManageVideos } from "@/config/permissions";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function VideoUploadPage() {
  const { access } = await getDashboardContext();
  requireVideoReadAccess(access);
  if (!canManageVideos(access.roles)) redirect("/video");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload wideo</h1>
          <p className="text-sm text-muted-foreground">
            Plik trafi do Supabase Storage, a AI wygeneruje raport sportowy.
          </p>
        </div>
        <Link href="/video" className={cn(buttonVariants({ variant: "outline" }))}>
          Wróć
        </Link>
      </div>
      <VideoUploadForm />
    </div>
  );
}
