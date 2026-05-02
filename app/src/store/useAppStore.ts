import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Opportunity, AppSettings, ExtractHistoryItem } from '@/types';
import { DEFAULT_OPPORTUNITIES } from '@/data/opportunities';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface AppState {
  opportunities: Opportunity[];
  settings: AppSettings;
  extractHistory: ExtractHistoryItem[];

  // Actions
  addOpportunity: (opp: Opportunity) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  moveStatus: (id: string, status: Opportunity['status']) => void;
  toggleChecklistItem: (oppId: string, itemId: string) => void;
  addChecklistItem: (oppId: string, text: string) => void;
  updateNotes: (oppId: string, notes: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addExtractHistory: (item: ExtractHistoryItem) => void;
  importOpportunities: (opps: Opportunity[]) => void;
  resetToDefaults: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      opportunities: DEFAULT_OPPORTUNITIES,
      settings: {
        googleConnected: false,
        googleEmail: null,
        calendarSync: false,
        deadlineReminders: true,
        reminderDays: 3,
        theme: 'light',
        compactMode: false,
        enableAnimations: true,
        backendUrl: '',
        aiEnabled: false,
      },
      extractHistory: [],

      addOpportunity: (opp) => set((s) => ({ opportunities: [opp, ...s.opportunities] })),
      updateOpportunity: (id, updates) => set((s) => ({
        opportunities: s.opportunities.map((o) => o.id === id ? { ...o, ...updates, dateModified: new Date().toISOString() } : o)
      })),
      deleteOpportunity: (id) => set((s) => ({ opportunities: s.opportunities.filter((o) => o.id !== id) })),
      moveStatus: (id, status) => get().updateOpportunity(id, { status }),
      toggleChecklistItem: (oppId, itemId) => set((s) => ({
        opportunities: s.opportunities.map((o) => {
          if (o.id !== oppId) return o;
          return {
            ...o,
            checklist: o.checklist.map((i) => i.id === itemId ? { ...i, completed: !i.completed } : i),
            dateModified: new Date().toISOString(),
          };
        }),
      })),
      addChecklistItem: (oppId, text) => set((s) => ({
        opportunities: s.opportunities.map((o) => {
          if (o.id !== oppId) return o;
          return {
            ...o,
            checklist: [...o.checklist, { id: generateId(), text, completed: false }],
          };
        }),
      })),
      updateNotes: (oppId, notes) => get().updateOpportunity(oppId, { notes }),
      updateSettings: (newSettings) => set((s) => ({ settings: { ...s.settings, ...newSettings } })),
      addExtractHistory: (item) => set((s) => ({ extractHistory: [item, ...s.extractHistory].slice(0, 50) })),
      importOpportunities: (opps) => set({ opportunities: opps }),
      resetToDefaults: () => set({ opportunities: DEFAULT_OPPORTUNITIES }),
    }),
    { name: 'optimi-store-v2' }
  )
);
