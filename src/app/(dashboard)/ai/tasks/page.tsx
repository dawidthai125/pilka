import Link from "next/link";

import { TaskCenter } from "@/features/ai-manager/components/task-center";
import { getAiTasksForUser } from "@/lib/ai/agent/loaders";
import { getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AiTasksPage() {
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const tasks = await getAiTasksForUser(access.clubId, access.userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centrum zadań AI</h1>
          <p className="text-sm text-muted-foreground">
            Oczekujące, wykonane, anulowane i wymagające zatwierdzenia.
          </p>
        </div>
        <Link href="/ai/manager" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Nowe polecenie
        </Link>
      </div>
      <TaskCenter tasks={tasks} />
    </div>
  );
}
