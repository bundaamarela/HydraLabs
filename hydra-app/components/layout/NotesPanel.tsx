'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '@/app/providers';

function IconNote() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
         stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <rect x="2.5" y="2" width="9" height="10" rx="1" />
      <line x1="4.5" y1="5"   x2="9.5" y2="5" />
      <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" />
      <line x1="4.5" y1="10"  x2="7.5" y2="10" />
    </svg>
  );
}

function useDebounce(fn: () => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delay);
  }, [fn, delay]);
}

export function NotesPanel() {
  const { notesOpen, closeNotes, openNotes, activeSessionId } = useApp();
  const [notes, setNotes] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (notesOpen) textareaRef.current?.focus();
  }, [notesOpen]);

  // Auto-save
  const save = useCallback(() => {
    if (!activeSessionId) return;
    fetch(`/api/sessions/${activeSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
  }, [activeSessionId, notes]);

  const debouncedSave = useDebounce(save, 1500);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    debouncedSave();
  };

  return (
    <>
      {/* floating toggle button */}
      {!notesOpen && (
        <button
          onClick={openNotes}
          title="Abrir notas"
          style={{
            position: 'fixed', right: 16, top: '50%',
            transform: 'translateY(-50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border)',
            color: 'var(--fg-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 25, cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
            (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
          }}
        >
          <IconNote />
        </button>
      )}

      {/* panel */}
      <aside
        style={{
          position: 'fixed', right: 0, top: 0,
          width: 'min(280px, 85vw)', height: '100dvh',
          background: 'var(--surface-2)',
          borderLeft: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          zIndex: 35,
          transform: notesOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 14px',
          borderBottom: '0.5px solid var(--border)',
          minHeight: 48, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)', letterSpacing: '-0.3px' }}>
            Notas
          </span>
          <button
            onClick={closeNotes}
            style={{
              width: 24, height: 24, borderRadius: 5,
              color: 'var(--fg-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, lineHeight: 1,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
              (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
            }}
          >
            ×
          </button>
        </div>

        {/* body */}
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={handleChange}
          placeholder="Escreve aqui…"
          style={{
            flex: 1, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            padding: '14px 16px',
            color: 'var(--cream)',
            fontFamily: 'inherit', fontSize: 12.5,
            lineHeight: 1.7, letterSpacing: '-0.05px',
          }}
        />

        {/* footer */}
        <div style={{
          padding: '9px 16px',
          borderTop: '0.5px solid var(--border)',
          fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0,
        }}>
          {activeSessionId ? 'Guardado automaticamente' : 'Abre uma sessão para guardar'}
        </div>
      </aside>
    </>
  );
}
