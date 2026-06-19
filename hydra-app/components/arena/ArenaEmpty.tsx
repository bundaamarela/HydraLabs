'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ACTIVE_MODELS, MODEL_ACCENTS, MODEL_CAPABILITIES, getModelById,
  type ModelId,
} from '@/lib/models';
import { DEFAULT_ROLES } from '@/lib/roles';

// Rótulo curto do provider por modelo (a config não o guarda; mapeado aqui).
const PROVIDERS: Partial<Record<ModelId, string>> = {
  chatgpt:  'OpenAI',
  grok:     'xAI',
  claude:   'Anthropic',
  gemini:   'Google',
  deepseek: 'DeepSeek',
  kimi:     'Moonshot',
};

// Sugestões de arranque (estáticas) — preenchem o input ao clicar.
const STATIC_SUGGESTIONS: string[] = [
  'Explica como funciona … com uma analogia e um exemplo concreto.',
  'Compara os prós e contras de … e recomenda uma escolha.',
  'Resume o estado da arte sobre … e aponta as questões em aberto.',
  'Cria um plano passo a passo para ….',
];

// ── capability icons (globo=web · cérebro=raciocínio · olho=visão) ──────────────
function IconGlobe() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1">
      <circle cx="7" cy="7" r="5.2" />
      <ellipse cx="7" cy="7" rx="2.2" ry="5.2" />
      <line x1="1.8" y1="7" x2="12.2" y2="7" />
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.9a3.9 3.9 0 0 0-2.4 7c.3.25.5.6.5 1v.3h3.8v-.3c0-.4.2-.75.5-1A3.9 3.9 0 0 0 7 1.9Z" />
      <line x1="5.5" y1="12.1" x2="8.5" y2="12.1" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 7s2.4-4 6-4 6 4 6 4-2.4 4-6 4-6-4-6-4Z" />
      <circle cx="7" cy="7" r="1.6" />
    </svg>
  );
}

// ── types ───────────────────────────────────────────────────────────────────
interface SessionItem {
  id: string; title: string; query: string;
  mode: string; voices: number; createdAt: string;
}
interface Template { id: string; name: string; body: string; }

interface ArenaEmptyProps {
  /** Modelos selecionados para esta consulta (conduz contagem + cartões). */
  models: ModelId[];
  /** Densidade da grelha (6=compacto · 3=normal · 2=espaçoso) → escala do espaçamento. */
  density: 2 | 3 | 6;
  /** Preenche o input com um prompt (sugestão/template). */
  onPickPrompt: (text: string) => void;
  /** Reabre uma sessão recente (carrega-a na Arena). */
  onReopen: (sessionId: string) => void;
}

const sectionLabel: CSSProperties = {
  fontSize: 9, fontWeight: 600, letterSpacing: '0.8px',
  color: 'var(--fg-faint)', textTransform: 'uppercase',
  marginBottom: 8,
};

export function ArenaEmpty({ models, density, onPickPrompt, onReopen }: ArenaEmptyProps) {
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<SessionItem[]>([]);

  useEffect(() => {
    // papéis: defaults + overrides do utilizador
    try {
      const raw = localStorage.getItem('hydra_model_roles');
      const stored = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      setRoles({ ...DEFAULT_ROLES, ...stored });
    } catch {
      setRoles({ ...DEFAULT_ROLES });
    }
    // templates guardados (alguns) + sessões recentes (5)
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d: Template[]) => setTemplates(Array.isArray(d) ? d.slice(0, 4) : []))
      .catch(() => {});
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d: SessionItem[]) => setRecent(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => {});
  }, []);

  const ids = models.length ? models : ACTIVE_MODELS.map((m) => m.id);
  const cards = ids.map((id) => getModelById(id)).filter((m): m is NonNullable<typeof m> => !!m);

  // Espaçamento conforme densidade.
  const gap        = density === 6 ? 10 : density === 2 ? 18 : 14;
  const sectionGap = density === 6 ? 18 : density === 2 ? 32 : 24;

  const chip = (label: string, onClick: () => void, key: string, title?: string) => (
    <button
      key={key}
      onClick={onClick}
      title={title}
      style={{
        fontSize: 11.5, color: 'var(--fg-muted)',
        background: 'var(--surface-2)', border: '0.5px solid var(--border)',
        borderRadius: 6, padding: '6px 11px', cursor: 'pointer',
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--cream)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: sectionGap,
        width: '100%', maxWidth: 780, margin: '0 auto',
        padding: '28px 20px',
      }}
    >
      {/* a. cabeçalho compacto com contagem dinâmica */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'var(--cream)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.3px',
        }}>
          HL
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', margin: 0, letterSpacing: '-0.1px' }}>
          Consulta <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{ids.length}</span>{' '}
          {ids.length === 1 ? 'inteligência' : 'inteligências'} em simultâneo.
        </p>
      </div>

      {/* b. grelha de cartões dos modelos (3 / 2 / 1 colunas) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
        gap,
      }}>
        {cards.map((m) => {
          const accent = MODEL_ACCENTS[m.id];
          const caps   = MODEL_CAPABILITIES[m.id];
          const role   = roles[m.id] ?? DEFAULT_ROLES[m.id] ?? '';
          return (
            <div
              key={m.id}
              style={{
                background: 'var(--surface-2)',
                border: '0.5px solid var(--border)',
                borderLeft: `2.5px solid ${accent}`,
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', whiteSpace: 'nowrap' }}>
                  {m.name}
                </span>
                {PROVIDERS[m.id] && (
                  <span style={{ fontSize: 10.5, color: 'var(--fg-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {PROVIDERS[m.id]}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-faint)', flexShrink: 0 }}>
                  {caps?.grounding && <span title="Pesquisa web ao vivo" style={{ display: 'flex' }}><IconGlobe /></span>}
                  {caps?.reasoning && <span title="Raciocínio" style={{ display: 'flex' }}><IconBrain /></span>}
                  {caps?.vision    && <span title="Visão" style={{ display: 'flex' }}><IconEye /></span>}
                </span>
              </div>
              {role && (
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                  {role}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* c. chips de sugestão (estáticas + templates guardados) */}
      <div>
        <div style={sectionLabel}>Começa por aqui</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {STATIC_SUGGESTIONS.map((s, i) => chip(s, () => onPickPrompt(s), `s${i}`, s))}
          {templates.map((t) => chip(t.name, () => onPickPrompt(t.body), `t${t.id}`, t.body))}
        </div>
      </div>

      {/* d. sessões recentes (só quando existem) */}
      {recent.length > 0 && (
        <div>
          <div style={sectionLabel}>Sessões recentes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recent.map((s) => (
              <button
                key={s.id}
                onClick={() => onReopen(s.id)}
                title={s.query}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: 7,
                  background: 'transparent', cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
                <span style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--fg-faint)' }}>
                  {s.mode} · {s.voices} {s.voices === 1 ? 'voz' : 'vozes'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
