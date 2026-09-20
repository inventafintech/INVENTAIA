import { AppShell } from '@/components/layout/AppShell';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
