'use client';

import { useState, useRef } from 'react';
import { ACTIVE_MODELS, type ModeId, type ModelId, MODE_LABELS } from '@/lib/models';
import type { Attachment } from '@/lib/orchestrator';
import { TemplatesMenu } from './TemplatesMenu';

const QUICK_MODES: ModeId[] = ['rapido', 'raciocinio', 'pesquisa', 'investigacao'];

function IconAttach() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 7l-5.5 5.5a3 3 0 0 1-4.2-4.2L8.5 3a2 2 0 0 1 2.8 2.8l-5.5 5.5a1 1 0 0 1-1.4-1.4L9.5 4.7" />
    </svg>
  );
}

interface InputBarProps {
  mode: ModeId;
  onModeSelect: (m: ModeId) => void;
  onSubmit: (query: string, attachment?: Attachment) => void;
  disabled: boolean;
  grounding: boolean;
  onGrounding: (v: boolean) => void;
  selectedModels: ModelId[];
  onToggleModel: (id: ModelId) => void;
}

export function InputBar({ mode, onModeSelect, onSubmit, disabled, grounding, onGrounding, selectedModels, onToggleModel }: InputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reseleccionar o mesmo ficheiro
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        kind: isImage ? 'image' : isPdf ? 'pdf' : 'text',
        data: String(reader.result ?? ''),
        mediaType: file.type || 'text/plain',
        name: file.name,
      });
    };
    if (isImage || isPdf) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q, attachment ?? undefined);
    setValue('');
    setAttachment(null);
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

  // Insere o corpo de um template (com tokens {{placeholder}}) no input.
  const handleInsertTemplate = (body: string) => {
    setValue(body);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = '36px';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    });
  };

  const canSubmit = !disabled && value.trim().length > 0;

  return (
    <div style={{
      // docado no fundo da região de conteúdo da Arena (em fluxo, não fixo)
      flexShrink: 0,
      background: 'var(--surface)',
      borderTop: '0.5px solid var(--border)',
      padding: '10px 16px 14px',
    }}>
      {/* model multi-select — quais modelos disparam nesta query */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 7, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {ACTIVE_MODELS.map((m) => {
          const on = selectedModels.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onToggleModel(m.id)}
              title={on ? `${m.name}: incluído nesta consulta` : `${m.name}: excluído`}
              style={{
                fontSize: 9.5, fontWeight: 600, letterSpacing: '0.3px',
                padding: '3px 8px', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 5,
                background: on ? 'var(--surface-3)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--fg-faint)',
                border: '0.5px solid var(--border)',
                cursor: 'pointer', opacity: on ? 1 : 0.55,
                transition: 'opacity 0.1s, background 0.1s, color 0.1s',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? 'var(--cream)' : 'var(--fg-faint)' }} />
              {m.name}
            </button>
          );
        })}
      </div>

      {/* mode chips */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
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

        {/* separador */}
        <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

        {/* web grounding toggle (Grok Web+X · Gemini Google Search) */}
        <button
          onClick={() => onGrounding(!grounding)}
          title={grounding ? 'Pesquisa web ao vivo: activa (Grok Web+X · Gemini Google Search)' : 'Pesquisa web ao vivo: desactivada'}
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
            padding: '3px 9px', borderRadius: 4,
            background: grounding ? 'var(--cream)' : 'var(--surface-2)',
            color: grounding ? 'var(--ink)' : 'var(--fg-muted)',
            border: '0.5px solid var(--border)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 0.1s, color 0.1s',
          }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: grounding ? 'var(--ok)' : 'var(--fg-faint)',
          }} />
          WEB
        </button>

        {/* separador */}
        <span style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

        {/* templates de consulta reutilizáveis */}
        <TemplatesMenu currentInput={value} onInsert={handleInsertTemplate} />
      </div>

      {/* attachment chip */}
      {attachment && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--surface-3)', border: '0.5px solid var(--border)',
            borderRadius: 6, padding: '3px 6px 3px 9px', fontSize: 11, color: 'var(--cream)',
          }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
              {attachment.kind}
            </span>
            <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachment.name}
            </span>
            <button
              onClick={() => setAttachment(null)}
              title="Remover anexo"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 16, height: 16, borderRadius: 4,
                color: 'var(--fg-faint)', fontSize: 14, lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* input row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10, padding: '6px 8px',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.25)',
      }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,.txt,.md,text/plain,text/markdown"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          title="Anexar imagem, PDF ou texto"
          style={{
            flexShrink: 0, height: 32, width: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--fg-muted)',
            border: '0.5px solid var(--border)', borderRadius: 7,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = 'var(--cream)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
        >
          <IconAttach />
        </button>
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
