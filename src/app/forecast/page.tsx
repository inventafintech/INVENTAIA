import { redirect } from 'next/navigation';

export default function ForecastRoutePage() {
  redirect('/dashboard?tab=predictiva');
}
