import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatsGridItem = {
  label: string;
  value: string | number;
};

type StatsGridProps = {
  items: StatsGridItem[];
  columns?: "3" | "4" | "5";
  variant?: "plain" | "card";
  valueClassName?: string;
};

const columnClasses: Record<NonNullable<StatsGridProps["columns"]>, string> = {
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 xl:grid-cols-4",
  "5": "sm:grid-cols-2 lg:grid-cols-5",
};

export function StatsGrid({
  items,
  columns = "3",
  variant = "plain",
  valueClassName,
}: StatsGridProps) {
  const gridClass = cn("grid gap-3", columnClasses[columns]);

  if (variant === "card") {
    return (
      <div className={gridClass}>
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold", valueClassName)}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", valueClassName)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
