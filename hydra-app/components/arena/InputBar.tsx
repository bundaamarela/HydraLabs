'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/app/providers';
import { type ModeId, MODE_LABELS } from '@/lib/models';

const QUICK_MODES: ModeId[] = ['rapido', 'raciocinio', 'pesquisa', 'investigacao'];

interface InputBarProps {
  mode: ModeId;
  onModeSelect: (m: ModeId) => void;
  onSubmit: (query: string) => void;
  disabled: boolean;
}

export function InputBar({ mode, onModeSelect, onSubmit, disabled }: InputBarProps) {
  const { sidebarW, notesW } = useApp();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = '36px';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <div style={{
      position: 'fixed', bottom: 0, zIndex: 20,
      left: sidebarW, right: notesW,
      transition: 'left 0.2s ease, right 0.2s ease',
      padding: '0 16px 16px',
    }}>
      {/* mode chips */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
        {QUICK_MODES.map((m) => (
          <button
            key={m}
            onClick={() => onModeSelect(m)}
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
              padding: '3px 9px', borderRadius: 4,
              background: mode === m ? 'var(--cream)' : 'var(--surface-2)',
              color: mode === m ? 'var(--ink)' : 'var(--fg-muted)',
              border: '0.5px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {MODE_LABELS[m].toUpperCase()}
          </button>
        ))}
      </div>

      {/* input row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10, padding: '6px 8px',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.25)',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreve a tua pergunta…"
          disabled={disabled}
          rows={1}
          style={{
            flex: 1, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: 'var(--cream)', fontFamily: 'inherit',
            fontSize: 13.5, lineHeight: 1.5,
            height: 36, maxHeight: 120,
            overflowY: 'auto',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flexShrink: 0, height: 32, padding: '0 14px',
            background: canSubmit ? 'var(--cream)' : 'var(--surface-3)',
            color: canSubmit ? 'var(--ink)' : 'var(--fg-faint)',
            border: '0.5px solid var(--border)',
            borderRadius: 7,
            fontSize: 12, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
