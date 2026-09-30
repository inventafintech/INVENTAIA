import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad | INVENTA.AI',
  description: 'Cómo INVENTA.AI recolecta, usa y protege tus datos.',
};

const BLOCKS: Array<{ h: string; p: string }> = [
  {
    h: '1. Datos que recolectamos',
    p: 'Datos de cuenta (nombre, correo, empresa), datos operativos que cargas (inventario, proveedores, órdenes) y datos técnicos mínimos (logs de acceso, dispositivo) necesarios para operar y asegurar el servicio.',
  },
  {
    h: '2. Uso de los datos',
    p: 'Usamos tus datos exclusivamente para prestar el servicio: calcular pronósticos, generar órdenes sugeridas y mostrar tus tableros. Nunca vendemos tus datos ni los usamos para entrenar modelos de otros clientes.',
  },
  {
    h: '3. Integraciones de terceros',
    p: 'Si conectas Google, Shopify, Mercado Libre, SAP, SUNAT u otros, solo accedemos a los permisos que autorizas y puedes revocarlos en cualquier momento desde Integraciones.',
  },
  {
    h: '4. Seguridad',
    p: 'Cifrado TLS 1.3 en tránsito, cifrado en reposo, autenticación OAuth 2.0 con verificación en dos pasos disponible y control de acceso por roles (Owner, Admin, Member).',
  },
  {
    h: '5. Tus derechos',
    p: 'Puedes solicitar acceso, rectificación o eliminación de tus datos personales escribiéndonos desde la página de soporte. Respondemos dentro de 15 días hábiles.',
  },
  {
    h: '6. Conservación',
    p: 'Conservamos tus datos mientras tu cuenta esté activa y hasta 12 meses después de cancelarla para fines contables y legales, salvo que solicites su eliminación anticipada.',
  },
  {
    h: '7. Contacto',
    p: 'Consultas de privacidad desde la página de soporte indicando en el asunto "Privacidad".',
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 20px 80px', fontFamily: 'inherit' }}>
      <Link href="/" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
        ← Volver al inicio
      </Link>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '16px 0 8px' }}>
        Política de Privacidad
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
