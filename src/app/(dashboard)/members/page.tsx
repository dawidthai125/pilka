import {
  ALL_PERMISSIONS,
  canManageMembers,
  CLUB_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "@/config/permissions";
import { MembersPanel } from "@/features/members/components/members-panel";
import { getClubMembers, getDashboardContext, requireMemberReadAccess } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MembersPage() {
  const { access } = await getDashboardContext();
  requireMemberReadAccess(access);
  const members = await getClubMembers();
  const canManage = canManageMembers(access.roles);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Członkowie</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzanie członkami klubu oraz macierz uprawnień RBAC.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Członkowie klubu</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "członek" : "członków"}
            {canManage ? " · masz uprawnienia do zarządzania" : " · widok tylko do odczytu"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersPanel members={members} actorRoles={access.roles} canManage={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Twoje role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {access.roles.map((role) => (
            <Badge key={role}>{ROLE_LABELS[role]}</Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macierz uprawnień</CardTitle>
          <CardDescription>Przypisanie uprawnień do ról klubowych</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Uprawnienie</th>
                {CLUB_ROLES.map((role) => (
                  <th key={role} className="px-2 py-2 text-center font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((permission) => (
                <tr key={permission} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{permission}</td>
                  {CLUB_ROLES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      {ROLE_PERMISSIONS[role].includes(permission) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
