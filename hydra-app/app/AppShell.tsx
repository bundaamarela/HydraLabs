'use client';

import { type ReactNode } from 'react';
import { useApp } from './providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotesPanel } from '@/components/layout/NotesPanel';

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarW, notesW } = useApp();

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
