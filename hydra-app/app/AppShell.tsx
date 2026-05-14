'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotesPanel } from '@/components/layout/NotesPanel';

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarW, notesW, toggleSidebar, toggleTheme, openNotes, closeNotes, notesOpen } = useApp();
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
      <main
        style={{
          marginLeft: sidebarW,
          marginRight: notesW,
          minHeight: '100vh',
          position: 'relative',
          transition: 'margin-left 0.2s ease, margin-right 0.2s ease',
        }}
      >
        {children}
      </main>
      <NotesPanel />
    </>
  );
}
