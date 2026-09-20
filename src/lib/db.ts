import fs from 'fs';
import path from 'path';

export interface IntegrationRecord {
  id: string;
  provider: string;
  status: 'pending_configuration' | 'configured' | 'active' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OAuthTokenRecord {
  id: string;
  integration_id?: string;
  provider: string;
  shop_domain?: string;
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncJobRecord {
  id: string;
  integration_id: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SyncResultRecord {
  id: string;
  sync_job_id: string;
  entity_type: string;
  items_synced: number;
  items_failed: number;
  details?: Record<string, any>;
  created_at: string;
}

export interface IntegrationLogRecord {
  id: string;
  provider: string;
  user_email: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  action: string;
  result: string;
  error_details?: string;
  ip_address?: string;
  created_at: string;
}

// In-memory + persistent storage
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'integrations_store.json');

interface DatabaseStore {
  integrations: Record<string, IntegrationRecord>;
  oauth_tokens: Record<string, OAuthTokenRecord>;
  sync_jobs: SyncJobRecord[];
  sync_results: SyncResultRecord[];
  integration_logs: IntegrationLogRecord[];
}

function initDb(): DatabaseStore {
  const defaultStore: DatabaseStore = {
    integrations: {
      shopify: {
        id: 'int-shopify',
        provider: 'shopify',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      mercadolibre: {
        id: 'int-meli',
        provider: 'mercadolibre',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      whatsapp: {
        id: 'int-whatsapp',
        provider: 'whatsapp',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sap: {
        id: 'int-sap',
        provider: 'sap',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      amazon: {
        id: 'int-amazon',
        provider: 'amazon',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sunat: {
        id: 'int-sunat',
        provider: 'sunat',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    oauth_tokens: {},
    sync_jobs: [],
    sync_results: [],
    integration_logs: [],
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Using memory store for integrations:', err);
  }

  return defaultStore;
}

let store: DatabaseStore = initDb();

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    // In serverless read-only contexts, retain in memory
  }
}

export const db = {
  getIntegrations: (): IntegrationRecord[] => {
    return Object.values(store.integrations);
  },

  getIntegration: (provider: string): IntegrationRecord | undefined => {
    return store.integrations[provider];
  },

  saveIntegration: (provider: string, config: Record<string, any>, status?: IntegrationRecord['status']) => {
    const existing = store.integrations[provider] || {
      id: `int-${provider}`,
      provider,
      status: 'pending_configuration',
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    existing.config = { ...existing.config, ...config };
    if (status) existing.status = status;
    existing.updated_at = new Date().toISOString();

    store.integrations[provider] = existing;
    persistStore();
    return existing;
  },

  getOAuthToken: (provider: string): OAuthTokenRecord | undefined => {
    return store.oauth_tokens[provider];
  },

  saveOAuthToken: (provider: string, tokenData: Partial<OAuthTokenRecord>) => {
    const now = new Date().toISOString();
    const token: OAuthTokenRecord = {
      id: `tok-${provider}-${Date.now()}`,
      provider,
      access_token: tokenData.access_token || '',
      refresh_token: tokenData.refresh_token,
      shop_domain: tokenData.shop_domain,
      scope: tokenData.scope,
      expires_at: tokenData.expires_at,
      created_at: now,
      updated_at: now,
    };

    store.oauth_tokens[provider] = token;
    
    // Update integration status to configured
    if (store.integrations[provider]) {
      store.integrations[provider].status = 'configured';
      store.integrations[provider].updated_at = now;
    }

    persistStore();
    return token;
  },

  createSyncJob: (integrationId: string, jobType: string): SyncJobRecord => {
    const job: SyncJobRecord = {
      id: `job-${Date.now()}`,
      integration_id: integrationId,
      job_type: jobType,
      status: 'running',
      started_at: new Date().toISOString(),
    };
    store.sync_jobs.unshift(job);
    persistStore();
    return job;
  },

  updateSyncJob: (jobId: string, status: SyncJobRecord['status'], errorMessage?: string) => {
    const job = store.sync_jobs.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      job.completed_at = new Date().toISOString();
      if (errorMessage) job.error_message = errorMessage;
      persistStore();
    }
  },

  saveSyncResult: (jobId: string, entityType: string, itemsSynced: number, itemsFailed: number, details?: Record<string, any>) => {
    const result: SyncResultRecord = {
      id: `res-${Date.now()}`,
      sync_job_id: jobId,
      entity_type: entityType,
      items_synced: itemsSynced,
      items_failed: itemsFailed,
      details,
      created_at: new Date().toISOString(),
    };
    store.sync_results.unshift(result);
    persistStore();
    return result;
  },

  addLog: (
    provider: string,
    level: IntegrationLogRecord['level'],
    action: string,
    result: string,
    errorDetails?: string,
    userEmail: string = 'admin@inventa.ai',
    ipAddress: string = '127.0.0.1'
  ): IntegrationLogRecord => {
    const log: IntegrationLogRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      provider,
      user_email: userEmail,
      level,
      action,
      result,
      error_details: errorDetails,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    };
    store.integration_logs.unshift(log);
    if (store.integration_logs.length > 500) {
      store.integration_logs = store.integration_logs.slice(0, 500);
    }
    persistStore();
    return log;
  },

  getLogs: (limit: number = 100): IntegrationLogRecord[] => {
    return store.integration_logs.slice(0, limit);
  }
};
