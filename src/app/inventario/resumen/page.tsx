import DashboardSummary from '@/components/inventory/DashboardSummary';

/* Server Component mínimo. NO envuelve AppShell:
   src/app/inventario/layout.tsx ya lo provee a todas las subrutas. */
export default function ResumenPage() {
  return <DashboardSummary />;
}
