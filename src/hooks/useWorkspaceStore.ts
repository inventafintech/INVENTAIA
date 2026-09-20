import { create } from 'zustand';

export interface WorkspaceSettings {
  razonSocial: string;
  ruc: string;
  leadTime: number;
  sla: string;
  moneda: string;
  horizonteProyeccion: string;
  alertasWhatsapp: boolean;
  resumenCorreo: boolean;
}

export interface WorkspaceState {
  // Objeto de configuración completo
  settings: WorkspaceSettings;

  // Acceso directo retrocompatible
  workspaceName: string;
  workspaceSlug: string;

  // Acciones
  updateWorkspaceSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  setWorkspaceName: (newName: string) => void;
  setWorkspaceSlug: (newSlug: string) => void;
  setWorkspace: (data: { name: string; slug?: string; settings?: Partial<WorkspaceSettings> }) => void;
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  razonSocial: 'Distribuidora San Martín',
  ruc: '20601234567',
  leadTime: 5,
  sla: '95',
  moneda: 'PEN',
  horizonteProyeccion: '30',
  alertasWhatsapp: true,
  resumenCorreo: true,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  settings: DEFAULT_SETTINGS,
  workspaceName: DEFAULT_SETTINGS.razonSocial,
  workspaceSlug: 'distribuidora-san-martin',

  updateWorkspaceSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      return {
        settings: updated,
        workspaceName: updated.razonSocial ?? state.workspaceName,
      };
    }),

  setWorkspaceName: (newName: string) =>
    set((state) => ({
      workspaceName: newName,
      settings: { ...state.settings, razonSocial: newName },
    })),

  setWorkspaceSlug: (newSlug: string) => set({ workspaceSlug: newSlug }),

  setWorkspace: (data) =>
    set((state) => {
      const updatedSettings = data.settings
        ? { ...state.settings, ...data.settings, razonSocial: data.name }
        : { ...state.settings, razonSocial: data.name };
      return {
        workspaceName: data.name,
        workspaceSlug: data.slug || state.workspaceSlug,
        settings: updatedSettings,
      };
    }),
}));

