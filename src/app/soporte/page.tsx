import { AppShell } from '@/components/layout/AppShell';
import { PendingConfigState } from '@/components/common/PendingConfigState';

export default function SoporteRoutePage() {
  return (
    <AppShell>
      <PendingConfigState
        title="Centro de Ayuda Enterprise & Documentación"
        moduleName="Soporte & Mesa de Ayuda"
        description="Módulo de soporte técnico prioritario de Inventa.AI para consultas sobre modelos predictivos, integración SAP S/4HANA y mesa de ayuda con respuesta en < 15 min."
        requiredIntegration="Mesa de Ayuda Enterprise / Zendesk API"
        checklist={[
          'Suscripción activa al plan Enterprise Cerebro de Compras',
          'Asignación de Key User o Gerente de Compras Autorizado',
          'Token de conexión a Helpdesk o canal directo de Slack/Teams',
        ]}
      />
    </AppShell>
  );
}
