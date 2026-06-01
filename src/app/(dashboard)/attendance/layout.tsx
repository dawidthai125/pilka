import { AttendanceSubNav } from "@/features/attendance/components/attendance-sub-nav";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Frekwencja &amp; dostępność</h1>
        <p className="text-sm text-muted-foreground">
          Dostępność zawodników, powołania meczowe i raporty trenera.
        </p>
      </div>
      <AttendanceSubNav />
      {children}
    </div>
  );
}
