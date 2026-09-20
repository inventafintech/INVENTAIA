import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function EstrategiaForecastPage() {
  redirect('/dashboard?tab=predictiva');
}
