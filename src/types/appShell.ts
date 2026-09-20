export type NavSection = 'PRINCIPAL' | 'OPERACIÓN' | 'FOOTER';

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  section: NavSection;
  badge?: number | string;
  iconName:
    | 'dashboard'
    | 'predictive'
    | 'replenishment'
    | 'orders'
    | 'financing'
    | 'inventory'
    | 'analytics'
    | 'integrations'
    | 'settings'
    | 'logout';
}

export type IntegrationStatus = 'pending_configuration' | 'configured' | 'active' | 'error';

export interface ProviderHealthCheck {
  provider: 'shopify' | 'mercadolibre' | 'sap' | 'whatsapp' | 'sunat' | 'pichincha_b2b';
  name: string;
  configured: boolean;
  status: IntegrationStatus;
  statusLabel: string;
  details: string;
  credentialsPresent: boolean;
}

export interface AppShellState {
  companyName: string;
  companyInitials: string;
  pageTitle: string;
  hasActiveIntegrations: boolean;
  statusText: string;
  integrationBadgeStatus: 'pending' | 'active' | 'warning';
  pendingOrdersCount: number;
  providers: ProviderHealthCheck[];
  lastSyncTimestamp: string | null;
}
