import { AppShell } from '@/components/layout/AppShell';

export default function AyudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
