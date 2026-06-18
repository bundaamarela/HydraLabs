'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/app/providers';

// ── types ─────────────────────────────────────────────────────────────────────

type ApiKeys = {
  [K in
    | 'OPENAI_API_KEY'
    | 'XAI_API_KEY'
    | 'ANTHROPIC_API_KEY'
    | 'GOOGLE_GENERATIVE_AI_API_KEY'
    | 'DEEPSEEK_API_KEY'
    | 'MOONSHOT_API_KEY']?: string;
};

const KEY_LABELS: { key: keyof ApiKeys; label: string; model: string }[] = [
  { key: 'OPENAI_API_KEY',               label: 'OpenAI',     model: 'GPT-5.5'             },
  { key: 'XAI_API_KEY',                  label: 'xAI',        model: 'Grok 4.3'            },
  { key: 'ANTHROPIC_API_KEY',            label: 'Anthropic',  model: 'Claude Sonnet 4.6'   },
  { key: 'GOOGLE_GENERATIVE_AI_API_KEY', label: 'Google',     model: 'Gemini 3.1 Pro'      },
  { key: 'DEEPSEEK_API_KEY',             label: 'DeepSeek',   model: 'DeepSeek V4 Pro'     },
  { key: 'MOONSHOT_API_KEY',             label: 'Moonshot',   model: 'Kimi K2.6'           },
];

const STORAGE_KEY = 'hydra_api_keys';

function loadKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApiKeys) : {};
  } catch {
    return {};
  }
}

function saveKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// ── icons ─────────────────────────────────────────────────────────────────────

function IconKey() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="7" r="3.5" />
      <line x1="9" y1="9.5" x2="14" y2="14.5" />
      <line x1="11.5" y1="12" x2="13.5" y2="12" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <path d="M1.5 7S4 3 7 3s5.5 4 5.5 4-2.5 4-5.5 4S1.5 7 1.5 7Z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12" />
      <path d="M5.5 4.5A5.5 5.5 0 0 1 7 4c3 0 5.5 4 5.5 4a10 10 0 0 1-1.5 2" />
      <path d="M9.5 9.5C8.7 10.4 7.9 11 7 11c-3 0-5.5-4-5.5-4a10 10 0 0 1 2-2.5" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 12,4" />
      <path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <rect x="3.5" y="4" width="7" height="8" rx=".8" />
    </svg>
  );
}

// ── key field ─────────────────────────────────────────────────────────────────

function KeyField({
  label, model, value, onChange,
}: {
  label: string;
  model: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const hasValue = value.trim().length > 0;
  const maskedValue = hasValue && !show
    ? value.slice(0, 4) + '•'.repeat(Math.min(value.length - 4, 24)) + (value.length > 28 ? value.slice(-4) : '')
    : value;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', marginBottom: 1 }}>
          {label}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>{model}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surface)',
        border: '0.5px solid ' + (focused ? 'var(--fg-muted)' : 'var(--border)'),
        borderRadius: 7,
        padding: '0 10px',
        height: 36,
        transition: 'border-color 0.12s',
      }}>
        <span style={{ color: hasValue ? 'var(--ok)' : 'var(--fg-faint)', flexShrink: 0 }}>
          {hasValue ? <IconCheck /> : <IconKey />}
        </span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          placeholder="sk-…"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 12,
            color: 'var(--cream)',
            fontFamily: hasValue && !show ? 'inherit' : 'monospace',
            letterSpacing: hasValue && !show ? '0.08em' : 'normal',
          }}
        />
        <button
          onClick={() => setShow((s) => !s)}
          style={{ color: 'var(--fg-faint)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          title={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
        {hasValue && (
          <button
            onClick={() => onChange('')}
            style={{ color: 'var(--fg-faint)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
            title="Apagar chave"
          >
            <IconTrash />
          </button>
        )}
      </div>
    </div>
  );
}

// ── section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontSize: 11, fontWeight: 500,
        color: 'var(--fg-muted)',
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: '0.5px solid var(--border)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── shortcut row ──────────────────────────────────────────────────────────────

function ShortcutRow({ action, keys }: { action: string; keys: string[] }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--cream)' }}>{action}</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {keys.map((k, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>+</span>}
            <kbd style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px 7px',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 4,
              fontSize: 10.5, fontFamily: 'inherit',
              color: 'var(--fg-muted)',
              minWidth: 22,
            }}>
              {k}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '0.5px solid var(--border)',
      gap: 24,
    }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 22,
          borderRadius: 11,
          background: checked ? 'var(--cream)' : 'var(--surface-3)',
          border: '0.5px solid ' + (checked ? 'transparent' : 'var(--border)'),
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 3, left: checked ? 18 : 3,
          width: 14, height: 14,
          borderRadius: '50%',
          background: checked ? 'var(--surface)' : 'var(--fg-faint)',
          transition: 'left 0.2s, background 0.2s',
        }} />
      </button>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { sidebarW, theme, toggleTheme } = useApp();

  const [keys, setKeys] = useState<ApiKeys>({});
  const [saved, setSaved] = useState(false);
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [showWordCount, setShowWordCount] = useState(true);
  const [syntesisAuto, setSyntesisAuto] = useState(true);

  useEffect(() => {
    setKeys(loadKeys());
    const prefs = localStorage.getItem('hydra_prefs');
    if (prefs) {
      try {
        const p = JSON.parse(prefs);
        if (p.autoSaveNotes  !== undefined) setAutoSaveNotes(p.autoSaveNotes);
        if (p.showWordCount  !== undefined) setShowWordCount(p.showWordCount);
        if (p.syntesisAuto   !== undefined) setSyntesisAuto(p.syntesisAuto);
      } catch { /* ignore */ }
    }
  }, []);

  const handleKeyChange = useCallback((key: keyof ApiKeys, value: string) => {
    setKeys((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setSaved(false);
  }, []);

  function handleSave() {
    saveKeys(keys);
    localStorage.setItem('hydra_prefs', JSON.stringify({ autoSaveNotes, showWordCount, syntesisAuto }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearData() {
    if (!confirm('Apagar todas as chaves API guardadas? Esta acção não pode ser desfeita.')) return;
    localStorage.removeItem(STORAGE_KEY);
    setKeys({} as ApiKeys);
  }

  return (
    <main style={{
      marginLeft: sidebarW,
      minHeight: '100vh',
      padding: '32px 32px 80px',
      transition: 'margin-left 0.2s ease',
      maxWidth: 760 + sidebarW,
    }}>

      {/* ── header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 600,
            color: 'var(--cream)', letterSpacing: '-0.5px',
            marginBottom: 3,
          }}>
            Configuração
          </h1>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            Chaves API e preferências locais. Tudo guardado apenas no teu browser.
          </p>
        </div>

        {/* save button */}
        <button
          onClick={handleSave}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            background: saved ? 'var(--ok)' : 'var(--cream)',
            color: saved ? '#fff' : 'var(--surface)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {saved && <IconCheck />}
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>

      {/* ── api keys ── */}
      <Section title="Chaves API">
        <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          As chaves são guardadas em <code style={{ fontSize: 10.5, color: 'var(--cream)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 3 }}>localStorage</code> e enviadas apenas ao servidor local para cada pedido. Nunca saem do teu dispositivo.
        </p>
        {KEY_LABELS.map(({ key, label, model }) => (
          <KeyField
            key={key}
            label={label}
            model={model}
            value={(keys as unknown as Record<string, string>)[key] ?? ''}
            onChange={(v) => handleKeyChange(key, v)}
          />
        ))}

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleClearData}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 11.5, fontWeight: 500,
              background: 'transparent',
              color: 'var(--err)',
              border: '0.5px solid var(--err)',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            Apagar todas as chaves
          </button>
        </div>
      </Section>

      {/* ── preferences ── */}
      <Section title="Preferências">
        <ToggleRow
          label="Guardar notas automaticamente"
          description="Grava as notas após 1.5 segundos de inactividade."
          checked={autoSaveNotes}
          onChange={setAutoSaveNotes}
        />
        <ToggleRow
          label="Mostrar contagem de palavras"
          description="Exibe o número de palavras em cada painel de resposta."
          checked={showWordCount}
          onChange={setShowWordCount}
        />
        <ToggleRow
          label="Síntese automática"
          description="Executa a síntese automaticamente quando todas as respostas estão prontas."
          checked={syntesisAuto}
          onChange={setSyntesisAuto}
        />
        <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', marginBottom: 2 }}>
              Tema
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              Aparência actual: {theme === 'dark' ? 'Escuro' : 'Claro'}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 16px',
              borderRadius: 7,
              fontSize: 12, fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--cream)',
              border: '0.5px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
          >
            {theme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'}
          </button>
        </div>
      </Section>

      {/* ── keyboard shortcuts ── */}
      <Section title="Atalhos de teclado">
        <ShortcutRow action="Enviar consulta"                keys={['Enter']} />
        <ShortcutRow action="Nova linha na consulta"         keys={['Shift', 'Enter']} />
        <ShortcutRow action="Foco na barra de pesquisa"      keys={['/']} />
        <ShortcutRow action="Recolher / expandir sidebar"    keys={['Ctrl', 'B']} />
        <ShortcutRow action="Abrir / fechar painel de notas" keys={['Ctrl', 'N']} />
        <ShortcutRow action="Ir para Arena"                  keys={['Ctrl', '1']} />
        <ShortcutRow action="Ir para Biblioteca"             keys={['Ctrl', '2']} />
        <ShortcutRow action="Ir para Configuração"           keys={['Ctrl', '3']} />
        <ShortcutRow action="Alternar tema"                  keys={['Ctrl', 'Shift', 'T']} />
      </Section>

      {/* ── about ── */}
      <Section title="Sobre">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {[
            { label: 'Versão',       value: '1.0.0' },
            { label: 'Modelos',      value: '6 ativos' },
            { label: 'Base de dados', value: 'SQLite (local)' },
            { label: 'Framework',    value: 'Next.js 14 + Vercel AI SDK' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '12px 14px',
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-faint)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--cream)' }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

    </main>
  );
}
