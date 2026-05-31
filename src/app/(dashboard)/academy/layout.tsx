import { AcademySubNav } from "@/features/academy/components/academy-sub-nav";

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <AcademySubNav />
      {children}
    </div>
  );
}
