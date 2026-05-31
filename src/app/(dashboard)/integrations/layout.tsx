import { IntegrationsSubNav } from "@/features/integrations/components/integrations-sub-nav";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <IntegrationsSubNav />
      {children}
    </div>
  );
}
