import Link from "next/link";
import { Users, Building2, Shield, User } from "lucide-react";

import { getDashboardContext } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/config/permissions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { profile, access, club, teams } = await getDashboardContext();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Witaj, {profile?.fullName ?? profile?.email}. Oto podsumowanie klubu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Klub</CardDescription>
            <CardTitle className="text-lg">{club.publicName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{club.competitionLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drużyny aktywne</CardDescription>
            <CardTitle className="text-lg">{teams.filter((t) => t.isActive).length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">W systemie klubu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Twoje role</CardDescription>
            <CardTitle className="text-lg">{access.roles.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {access.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uprawnienia</CardDescription>
            <CardTitle className="text-lg">{access.permissions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Aktywne w bieżącym klubie</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Szybkie akcje
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/club" className={cn(buttonVariants({ variant: "outline" }))}>
              Profil klubu
            </Link>
            <Link href="/teams" className={cn(buttonVariants({ variant: "outline" }))}>
              Drużyny
            </Link>
            <Link href="/members" className={cn(buttonVariants({ variant: "outline" }))}>
              Role
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Drużyny
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak drużyn.</p>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between text-sm">
                  <span>{team.name}</span>
                  <Badge variant={team.isActive ? "default" : "secondary"}>
                    {team.isActive ? "Aktywna" : "Nieaktywna"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4" />
            Dostęp użytkownika
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            {profile?.email}
          </div>
          <div className="break-words text-sm text-muted-foreground">
            Uprawnienia: {access.permissions.join(", ")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
