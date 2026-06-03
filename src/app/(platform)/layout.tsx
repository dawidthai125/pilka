import { requirePlatformAdmin } from "@/lib/platform/admin";

export default async function PlatformRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformAdmin();
  return children;
}
