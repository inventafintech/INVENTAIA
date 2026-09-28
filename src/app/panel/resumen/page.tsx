import DashboardOverview from '@/components/inventory/DashboardOverview';

/* Sección PANEL → Resumen: centro de control ejecutivo (4 KPIs, forecast 90d,
   top 5 acciones). El Centro de Control de 8 módulos vive en /dashboard. */
export default function ResumenPage() {
  return <DashboardOverview />;
}
