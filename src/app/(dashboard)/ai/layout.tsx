import { AiSubNav } from "@/features/ai/components/ai-sub-nav";

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AiSubNav />
      {children}
    </div>
  );
}
