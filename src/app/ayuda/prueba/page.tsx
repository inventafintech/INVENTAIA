import { redirect } from 'next/navigation';

export default function PonmeAPruebaPage() {
  redirect('/dashboard?tab=predictiva');
}
