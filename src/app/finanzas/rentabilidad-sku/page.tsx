import { AppShell } from '@/components/layout/AppShell';
import AnalyticsPage from '@/app/dashboard/analytics/page';

export const dynamic = 'force-dynamic';

export default function FinanzasRentabilidadSkuPage() {
  return (
    <AppShell>
      <AnalyticsPage />
    </AppShell>
  );
}
