import { CrmSubNav } from "@/features/crm/components/crm-sub-nav";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold">Club CRM</h1>
        <p className="text-sm text-muted-foreground">
          Relacje, sponsorzy, rodzice, partnerzy i wydarzenia klubu.
        </p>
      </div>
      <CrmSubNav />
      {children}
    </div>
  );
}
