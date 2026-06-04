import { AuditCenterView } from "@/features/platform/components/audit-center-view";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadAuditCenter } from "@/lib/platform/audit-center";

type PageProps = {
  searchParams: Promise<{
    clubId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function PlatformAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await loadAuditCenter({
    clubId: params.clubId,
    action: params.action,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  return (
    <PlatformShell
      title="Audit Center"
      subtitle="Historia operacji platformy — utworzenie klubu, konfiguracja ligi, aktywacja."
    >
      <AuditCenterView data={data} />
    </PlatformShell>
  );
}
