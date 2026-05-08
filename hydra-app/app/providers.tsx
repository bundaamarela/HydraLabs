'use client';

import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react';

interface AppState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  notesOpen: boolean;
  activeSessionId: string | null;
  sidebarW: number;
  notesW: number;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  openNotes: () => void;
  closeNotes: () => void;
  setActiveSessionId: (id: string | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const sidebarW = sidebarCollapsed ? 52 : 220;
  const notesW   = notesOpen ? 280 : 0;

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((c) => !c),
    [],
  );

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);                                                         // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider
      value={{
        theme, sidebarCollapsed, notesOpen, activeSessionId,
        sidebarW, notesW,
        toggleTheme, toggleSidebar,
        openNotes:  () => setNotesOpen(true),
        closeNotes: () => setNotesOpen(false),
        setActiveSessionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
