import Link from 'next/link';

export const metadata = {
  title: 'Términos de Servicio | INVENTA.AI',
  description: 'Términos de Servicio de la plataforma INVENTA.AI.',
};

const BLOCKS: Array<{ h: string; p: string }> = [
  {
    h: '1. Objeto del servicio',
    p: 'INVENTA.AI provee una plataforma B2B de gestión de inventario, pronóstico de demanda, órdenes de compra y financiamiento de capital de trabajo. Al crear una cuenta aceptas estos términos.',
  },
  {
    h: '2. Cuentas y acceso',
    p: 'Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad bajo tu cuenta. Debes notificarnos de inmediato ante cualquier uso no autorizado.',
  },
  {
    h: '3. Uso aceptable',
    p: 'Queda prohibido usar la plataforma para actividades ilícitas, intentar vulnerar su seguridad, extraer datos de otros clientes o sobrecargar intencionalmente el servicio.',
  },
  {
    h: '4. Planes y facturación',
    p: 'Los planes Light, Essential y Corporate se facturan por adelantado en ciclos mensuales o anuales. Puedes cancelar en cualquier momento; el acceso continúa hasta el fin del periodo pagado.',
  },
  {
    h: '5. Datos y privacidad',
    p: 'Tus datos operativos (inventario, proveedores, órdenes) son de tu propiedad. Los tratamos según nuestra Política de Privacidad y no los compartimos con terceros sin tu autorización.',
  },
  {
    h: '6. Disponibilidad y soporte',
    p: 'Operamos con objetivo de 99.9% de disponibilidad. El soporte prioritario responde en menos de 15 minutos en horario laboral (America/Lima).',
  },
  {
    h: '7. Limitación de responsabilidad',
    p: 'Las proyecciones de demanda son estimaciones estadísticas y no constituyen garantía de resultados. Nuestra responsabilidad máxima se limita a lo pagado en los últimos 12 meses.',
  },
  {
    h: '8. Contacto',
    p: 'Para consultas legales escríbenos desde la página de soporte o a través de tu ejecutivo de cuenta.',
  },
];

export default function TermsPage() {
  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 20px 80px', fontFamily: 'inherit' }}>
      <Link href="/" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
        ← Volver al inicio
      </Link>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '16px 0 8px' }}>
        Términos de Servicio
      </h1>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '32px' }}>
        Última actualización: septiembre 2026 · INVENTA.AI Technologies Inc.
      </p>
      {BLOCKS.map((b) => (
        <section key={b.h} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{b.h}</h2>
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155', margin: 0 }}>{b.p}</p>
        </section>
      ))}
    </main>
  );
}
