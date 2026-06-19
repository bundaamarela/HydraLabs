'use client';

import { useEffect, useRef } from 'react';
import { ModeId, MODE_LABELS, MODE_DESCRIPTIONS } from '@/lib/models';

const SELECTABLE: ModeId[] = ['rapido', 'raciocinio', 'pesquisa', 'investigacao', 'direto', 'consolidacao'];

interface ModeSelectorProps {
  open: boolean;
  onClose: () => void;
  mode: ModeId;
  onSelect: (m: ModeId) => void;
}

export function ModeSelector({ open, onClose, mode, onSelect }: ModeSelectorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '50%', top: 50,
        transform: 'translateX(-50%)',
        width: 290,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        zIndex: 50,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        animation: 'popIn 0.12s ease',
      }}
    >
      {SELECTABLE.map((m, i) => {
        const { desc, hint } = MODE_DESCRIPTIONS[m];
        const active = m === mode;
        return (
          <button
            key={m}
            onClick={() => { onSelect(m); onClose(); }}
            style={{
              width: '100%', textAlign: 'left',
              padding: '11px 14px',
              borderBottom: i < SELECTABLE.length - 1 ? '0.5px solid var(--border)' : 'none',
              background: active ? 'var(--surface-3)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 3,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.2px',
                color: active ? 'var(--cream)' : 'var(--fg-muted)',
              }}>
                {MODE_LABELS[m].toUpperCase()}
              </span>
              <span style={{
                fontSize: 9.5, color: 'var(--fg-faint)', letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                {hint}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
              {desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}
