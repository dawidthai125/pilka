import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InjuryAiInsight } from "@/types/injuries";

const severityClass: Record<InjuryAiInsight["severity"], string> = {
  info: "border-blue-200 bg-blue-50/50",
  warning: "border-amber-200 bg-amber-50/50",
  critical: "border-red-200 bg-red-50/50",
};

export function InjuryAiPanel({ insights }: { insights: InjuryAiInsight[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Rekomendacje AI — bez automatycznych decyzji. Weryfikuj z trenerem i planem powrotu.
      </p>
      {insights.map((insight) => (
        <Card key={insight.id} className={severityClass[insight.severity]}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{insight.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{insight.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
