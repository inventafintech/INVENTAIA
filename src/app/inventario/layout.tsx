import { AppShell } from '@/components/layout/AppShell';

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
