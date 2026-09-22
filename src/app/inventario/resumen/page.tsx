import { redirect } from 'next/navigation';

/* URL canónica del Resumen: /panel/resumen (sección PANEL del Sidebar).
   Esta ruta redirige para no duplicar la vista. */
export default function InventarioResumenRedirect() {
  redirect('/panel/resumen');
}
