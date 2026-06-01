import { CommunicationSubNav } from "@/features/communication/components/communication-sub-nav";

export default function CommunicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <CommunicationSubNav />
      {children}
    </div>
  );
}
