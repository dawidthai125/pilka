import type { CrmParentContext } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function CrmParentsPanel({ context }: { context: CrmParentContext }) {
  return (
    <div className="space-y-6">
      {context.contact ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil CRM rodzica</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{context.contact.name}</p>
            {context.contact.email ? <p>{context.contact.email}</p> : null}
            {context.contact.phone ? <p>{context.contact.phone}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Brak powiązanego kontaktu CRM — skontaktuj się z zarządem klubu.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dzieci</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {context.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak przypisanych zawodników.</p>
          ) : (
            context.children.map((child) => (
              <div key={child.id} className="flex items-center justify-between text-sm">
                <span>{child.name}</span>
                <span className="text-muted-foreground">{child.teamName ?? "—"}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Komunikacja</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{context.recentCommunications} opublikowanych komunikatów trenera w klubie</p>
            <Link href="/communication" className="text-primary mt-2 inline-block text-sm hover:underline">
              Otwórz Communication Hub →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obecności</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Dostępność dzieci: {context.attendanceSummary.present}/{context.attendanceSummary.total} zgłoszeń
            </p>
            <Link href="/attendance" className="text-primary mt-2 inline-block text-sm hover:underline">
              Moduł frekwencji →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
