import { create } from 'zustand';

interface WorkspaceState {
  workspaceName: string;
  workspaceSlug: string;
  setWorkspaceName: (newName: string) => void;
  setWorkspaceSlug: (newSlug: string) => void;
  setWorkspace: (data: { name: string; slug?: string }) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaceName: 'Distribuidora San Martín',
  workspaceSlug: 'distribuidora-san-martin',
  setWorkspaceName: (newName: string) => set({ workspaceName: newName }),
  setWorkspaceSlug: (newSlug: string) => set({ workspaceSlug: newSlug }),
  setWorkspace: (data) =>
    set((state) => ({
      workspaceName: data.name,
      workspaceSlug: data.slug || state.workspaceSlug,
    })),
}));
