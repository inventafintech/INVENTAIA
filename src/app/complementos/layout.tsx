import { AppShell } from '@/components/layout/AppShell';

export default function ComplementosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
