'use client';

import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react';

// ── sidebar sizing ─────────────────────────────────────────────────────────────
const SIDEBAR_MIN       = 180;  // narrowest the user can drag to
const SIDEBAR_MAX       = 420;  // widest the user can drag to
const SIDEBAR_DEFAULT   = 240;  // initial expanded width
const SIDEBAR_COLLAPSED = 64;   // icon-only rail
const NARROW_BREAKPOINT = 768;  // below this the sidebar auto-collapses to a rail
const MOBILE_BREAKPOINT = 640;  // below this the sidebar becomes an overlay drawer

const clampW = (w: number) =>
  Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)));

interface AppState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;   // effective (includes responsive auto-collapse)
  notesOpen: boolean;
  activeSessionId: string | null;
  pendingSessionId: string | null;   // sessão pedida para reabrir na Arena
  sidebarW: number;            // effective rendered width of the sidebar element
  sidebarWidth: number;        // user's expanded-width preference
  sidebarMin: number;
  sidebarMax: number;
  sidebarDefault: number;
  notesW: number;
  isMobile: boolean;           // viewport below the mobile breakpoint
  mobileNavOpen: boolean;      // overlay drawer visibility (mobile only)
  contentOffset: number;       // left offset content must reserve (0 on mobile)
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  openNotes: () => void;
  closeNotes: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  setActiveSessionId: (id: string | null) => void;
  openSession: (id: string) => void;       // reabrir sessão guardada na Arena
  clearPendingSession: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [collapsedPref, setCollapsedPref] = useState(false);
  const [sidebarWidth, setSidebarWidthState] = useState(SIDEBAR_DEFAULT);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // Mobile: the sidebar is an overlay drawer (always expanded, never a rail) and
  // reserves no horizontal space. Desktop/tablet: narrow viewport forces the rail.
  const sidebarCollapsed = isMobile ? false : (collapsedPref || isNarrow);
  const sidebarW = isMobile
    ? sidebarWidth
    : (sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth);
  const contentOffset = isMobile ? 0 : sidebarW;
  const notesW   = isMobile ? 0 : (notesOpen ? 280 : 0);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(
    () => setCollapsedPref((c) => {
      const next = !c;
      try { localStorage.setItem('hydra:sidebar-collapsed', next ? '1' : '0'); } catch {}
      return next;
    }),
    [],
  );

  const setSidebarWidth = useCallback((w: number) => {
    const cw = clampW(w);
    setSidebarWidthState(cw);
    try { localStorage.setItem('hydra:sidebar-width', String(cw)); } catch {}
  }, []);

  const openMobileNav   = useCallback(() => setMobileNavOpen(true),  []);
  const closeMobileNav  = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((o) => !o), []);

  const openSession        = useCallback((id: string) => setPendingSessionId(id), []);
  const clearPendingSession = useCallback(() => setPendingSessionId(null), []);

  // Apply theme + restore persisted sidebar prefs on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      const w = Number(localStorage.getItem('hydra:sidebar-width'));
      if (w) setSidebarWidthState(clampW(w));
      const c = localStorage.getItem('hydra:sidebar-collapsed');
      if (c != null) setCollapsedPref(c === '1');
    } catch {}
  }, []);                                                         // eslint-disable-line react-hooks/exhaustive-deps

  // Responsive: track narrow viewports (→ rail) and mobile viewports (→ drawer).
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setIsNarrow(w < NARROW_BREAKPOINT);
      const mobile = w < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileNavOpen(false); // never leave the drawer "open" on desktop
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);

  return (
    <AppContext.Provider
      value={{
        theme, sidebarCollapsed, notesOpen, activeSessionId, pendingSessionId,
        sidebarW, sidebarWidth,
        sidebarMin: SIDEBAR_MIN, sidebarMax: SIDEBAR_MAX, sidebarDefault: SIDEBAR_DEFAULT,
        notesW,
        isMobile, mobileNavOpen, contentOffset,
        toggleTheme, toggleSidebar, setSidebarWidth,
        openNotes:  () => setNotesOpen(true),
        closeNotes: () => setNotesOpen(false),
        openMobileNav, closeMobileNav, toggleMobileNav,
        setActiveSessionId, openSession, clearPendingSession,
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
