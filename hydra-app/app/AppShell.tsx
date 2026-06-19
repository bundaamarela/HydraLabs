'use client';

import { useEffect, type ReactNode, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotesPanel } from '@/components/layout/NotesPanel';

export function AppShell({ children }: { children: ReactNode }) {
  const {
    sidebarW, toggleSidebar, toggleTheme, openNotes, closeNotes, notesOpen,
    isMobile, mobileNavOpen, closeMobileNav,
  } = useApp();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        notesOpen ? closeNotes() : openNotes();
      } else if (e.key === '1') {
        e.preventDefault();
        router.push('/');
      } else if (e.key === '2') {
        e.preventDefault();
        router.push('/library');
      } else if (e.key === '3') {
        e.preventDefault();
        router.push('/workspace');
      } else if (e.key === '4') {
        e.preventDefault();
        router.push('/settings');
      } else if ((e.key === 't' || e.key === 'T') && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar, toggleTheme, openNotes, closeNotes, notesOpen, router]);

  // Shell = grelha fixa de viewport inteira. Coluna 1 = sidebar (largura
  // `auto`, conduzida pela largura do elemento, que anima suavemente); coluna 2 =
  // conteúdo (minmax(0,1fr) → flexível e nunca transborda). No mobile a sidebar
  // sai do fluxo (drawer fixo) e a grelha passa a uma única coluna.
  const shell: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'auto minmax(0, 1fr)',
    gridTemplateRows: '100dvh',
    height: '100dvh',
    overflow: 'hidden',
  };

  return (
    <div style={shell}>
      <Sidebar />

      {/* backdrop do drawer (apenas mobile) */}
      {isMobile && (
        <div
          onClick={closeMobileNav}
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 44,
            background: 'rgba(0,0,0,0.5)',
            opacity: mobileNavOpen ? 1 : 0,
            pointerEvents: mobileNavOpen ? 'auto' : 'none',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* coluna de conteúdo — flex-col: banda de cabeçalho (fixa) + região que rola */}
      <main
        style={{
          minWidth: 0, minHeight: 0, height: '100%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {children}
      </main>

      <NotesPanel />
    </div>
  );
}
