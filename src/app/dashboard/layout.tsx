import { AppShell } from '@/components/layout/AppShell';

export const metadata = {
  title: 'Cerebro de Compras | INVENTA.AI',
  description: 'Plataforma B2B de optimización de compras, inventario y financiamiento.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
