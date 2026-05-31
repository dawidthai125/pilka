import { TEAM_CATEGORY_LABELS } from "@/config/constants";
import { canManageTeams } from "@/config/permissions";
import { getDashboardContext } from "@/lib/auth/session";
import { CreateTeamForm } from "@/features/club/components/create-team-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const categoryLabels = TEAM_CATEGORY_LABELS;

export default async function TeamsPage() {
  const { access, teams } = await getDashboardContext();
  const canManage = canManageTeams(access.roles);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drużyny</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzanie drużynami klubu.
        </p>
      </div>

      {canManage ? <CreateTeamForm /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista drużyn</CardTitle>
          <CardDescription>{teams.length} drużyn w systemie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak drużyn.</p>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {categoryLabels[team.category]}
                    {team.season ? ` • ${team.season}` : ""}
                  </p>
                </div>
                <Badge variant={team.isActive ? "default" : "secondary"}>
                  {team.isActive ? "Aktywna" : "Nieaktywna"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
