import { AppShell } from '@/components/layout/AppShell';
import ReabastecimientoPage from '@/app/dashboard/reabastecimiento/page';

export const dynamic = 'force-dynamic';

export default function EstrategiaComprasRecomendadasPage() {
  return (
    <AppShell>
      <ReabastecimientoPage />
    </AppShell>
  );
}
