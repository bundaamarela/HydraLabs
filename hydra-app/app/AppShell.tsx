'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from './providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotesPanel } from '@/components/layout/NotesPanel';

export function AppShell({ children }: { children: ReactNode }) {
  const {
    contentOffset, notesW, toggleSidebar, toggleTheme, openNotes, closeNotes, notesOpen,
    isMobile, mobileNavOpen, openMobileNav, closeMobileNav,
  } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Arena ('/') has its own sticky Topbar that hosts the hamburger; every other
  // route is a plain page, so on mobile it needs top room to clear the floating
  // hamburger button.
  const isArena = pathname === '/';

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

  return (
    <>
      <Sidebar />

      {/* mobile drawer backdrop */}
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

      {/* mobile hamburger — opens the drawer */}
      {isMobile && !mobileNavOpen && (
        <button
          onClick={openMobileNav}
          aria-label="Abrir menu"
          style={{
            position: 'fixed', top: 9, left: 10, zIndex: 30,
            width: 34, height: 34, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-3)', color: 'var(--cream)',
            border: '0.5px solid var(--border)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="2.5" y1="4.5"  x2="13.5" y2="4.5" />
            <line x1="2.5" y1="8"    x2="13.5" y2="8" />
            <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
          </svg>
        </button>
      )}

      <main
        style={{
          marginLeft: contentOffset,
          marginRight: notesW,
          minHeight: '100dvh',
          position: 'relative',
          paddingTop: isMobile && !isArena ? 44 : undefined,
          transition: 'margin-left 0.2s ease, margin-right 0.2s ease',
        }}
      >
        {children}
      </main>
      <NotesPanel />
    </>
  );
}
