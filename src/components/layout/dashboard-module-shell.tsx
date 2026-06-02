import { cn } from "@/lib/utils";

type DashboardModuleShellProps = {
  title?: string;
  description?: string;
  nav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function DashboardModuleShell({
  title,
  description,
  nav,
  children,
  className,
}: DashboardModuleShellProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {(title || description) && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--club-primary)_12%,transparent)] bg-[color-mix(in_srgb,var(--club-primary)_4%,white)] px-5 py-4 sm:px-6">
          {title ? <h1 className="text-xl font-bold tracking-tight text-[var(--club-primary)] sm:text-2xl">{title}</h1> : null}
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      )}
      {nav}
      <div className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">{children}</div>
    </div>
  );
}
