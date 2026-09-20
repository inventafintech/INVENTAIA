import { AppShell } from '@/components/layout/AppShell';
import FinanciamientoPage from '@/app/dashboard/financiamiento/page';

export const dynamic = 'force-dynamic';

export default function FinanzasFinanciamientoDisponiblePage() {
  return (
    <AppShell>
      <FinanciamientoPage />
    </AppShell>
  );
}
