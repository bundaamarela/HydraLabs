'use client';

import { ModeId, MODE_LABELS } from '@/lib/models';
import { useApp } from '@/app/providers';

interface TopbarProps {
  mode: ModeId;
  onModeClick: () => void;
  processingCount: number;
  doneCount: number;
  density: 2 | 3 | 6;
  onDensity: (d: 2 | 3 | 6) => void;
}

export function Topbar({ mode, onModeClick, processingCount, doneCount, density, onDensity }: TopbarProps) {
  const { isMobile } = useApp();
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      height: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 16px 0 52px' : '0 16px',
      background: 'var(--surface-2)',
      borderBottom: '0.5px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* left: mode badge */}
      <button
        onClick={onModeClick}
        style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
          color: 'var(--fg-muted)',
          background: 'var(--surface-3)',
          border: '0.5px solid var(--border)',
          borderRadius: 5, padding: '4px 9px',
          cursor: 'pointer',
          transition: 'color 0.12s, background 0.12s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
        }}
      >
        {MODE_LABELS[mode].toUpperCase()}
      </button>

      {/* right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(processingCount > 0 || doneCount > 0) && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            {processingCount > 0 && `${processingCount} a processar · `}
            {doneCount} concluída{doneCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* density selector */}
        <div style={{
          display: 'flex', gap: 1,
          background: 'var(--surface-3)',
          borderRadius: 6, padding: 2,
          border: '0.5px solid var(--border)',
        }}>
          {([2, 3, 6] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDensity(d)}
              style={{
                width: 32, height: 24, borderRadius: 4,
                fontSize: 11, fontWeight: 500,
                background: density === d ? 'var(--surface-2)' : 'transparent',
                color: density === d ? 'var(--cream)' : 'var(--fg-muted)',
                border: density === d ? '0.5px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {d}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
