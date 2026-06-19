'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ACTIVE_MODELS, CROSS_ACTIONS, crossExamTag, getModelById,
  MODEL_ACCENTS, MODEL_CAPABILITIES,
  type ModelConfig, type ModelId, type CrossAction,
} from '@/lib/models';

export type PanelStatus = 'idle' | 'processing' | 'streaming' | 'done' | 'error';

/** Turno de cruzamento (crítica de outro modelo) exibido dentro deste painel. */
export interface CrossExamTurn {
  id: string;
  sourceModel: ModelId;
  action: CrossAction;
  status: PanelStatus;
  content: string;
  reasoning?: string;
  error?: string;
}

interface PanelProps {
  model: ModelConfig;
  status: PanelStatus;
  content: string;
  reasoning?: string;
  sources?: { url: string; title?: string }[];
  unsupported?: boolean;
  crossExams?: CrossExamTurn[];
  /** Modelos-alvo possíveis para cruzamento (os do round); default: todos activos. */
  crossTargetIds?: ModelId[];
  grounding?: boolean;
  error?: string;
  /** Dispara um cruzamento: envia a resposta deste painel a outro modelo. */
  onCrossExam?: (targetModel: ModelId, action: CrossAction) => void;
  /** Re-dispara apenas este modelo com a mesma pergunta/modo/papéis/grounding. */
  onRegenerate?: () => void;
  /** Vista maximizada (modo foco): painel ocupa o ecrã. */
  focused?: boolean;
}

// Default global de mostrar/ocultar raciocínio (hydra_prefs.showReasoning).
function readShowReasoningDefault(): boolean {
  try {
    const raw = localStorage.getItem('hydra_prefs');
    if (!raw) return false;
    return (JSON.parse(raw) as { showReasoning?: boolean }).showReasoning === true;
  } catch {
    return false;
  }
}

function IconChevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,2.5 8,6 4,9.5" />
    </svg>
  );
}

// Ícones de capacidade do cabeçalho: globo=web, "pensa"=raciocínio, olho=visão.
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

function ProcessingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '6px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--fg-faint)',
            display: 'inline-block',
            animation: `dotpulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((para, pi) => {
        if (para.startsWith('```')) {
          const inner = para.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
          return (
            <pre key={pi} style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 5,
              padding: '8px 10px',
              fontSize: 11.5, overflowX: 'auto',
              margin: '0 0 8px', lineHeight: 1.6,
              color: 'var(--cream-2)',
            }}>
              <code>{inner}</code>
            </pre>
          );
        }
        const lines = para.split('\n');
        return (
          <p key={pi} style={{ margin: '0 0 8px', lineHeight: 1.65 }}>
            {lines.map((line, li) => (
              <span key={li}>
                {line}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function StatusBadge({ status }: { status: PanelStatus }) {
  if (status === 'idle') return null;
  const map: Record<string, { label: string; color: string }> = {
    processing: { label: 'A PENSAR',   color: 'var(--fg-faint)' },
    streaming:  { label: 'A ESCREVER', color: 'var(--fg-muted)' },
    done:       { label: 'CONCLUÍDO',  color: 'var(--ok)'       },
    error:      { label: 'ERRO',       color: 'var(--err)'      },
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <span style={{ fontSize: 9, letterSpacing: '0.4px', color: entry.color }}>
      {entry.label}
    </span>
  );
}

function CrossStatusLabel({ status }: { status: PanelStatus }) {
  const map: Partial<Record<PanelStatus, { label: string; color: string }>> = {
    processing: { label: 'A PENSAR',   color: 'var(--fg-faint)' },
    streaming:  { label: 'A ESCREVER', color: 'var(--fg-muted)' },
    error:      { label: 'ERRO',       color: 'var(--err)'      },
  };
  const e = map[status];
  if (!e) return null;
  return <span style={{ fontSize: 8.5, letterSpacing: '0.4px', color: e.color }}>{e.label}</span>;
}

// Turno de cruzamento renderizado dentro do painel do modelo-alvo.
function CrossExamTurnView({ turn }: { turn: CrossExamTurn }) {
  const [showR, setShowR] = useState(false);
  const sourceName = getModelById(turn.sourceModel)?.name ?? turn.sourceModel;
  return (
    <div style={{ borderTop: '0.5px solid var(--border)', padding: '9px 12px', flexShrink: 0, background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: turn.content || turn.reasoning ? 6 : 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--fg-muted)' }}>⇄</span>
          {crossExamTag(turn.action, sourceName)}
        </span>
        <CrossStatusLabel status={turn.status} />
      </div>

      {turn.reasoning && (
        <div style={{ marginBottom: 6 }}>
          <button
            onClick={() => setShowR((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', padding: 0 }}
          >
            <span style={{ display: 'flex', transform: showR ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              <IconChevron />
            </span>
            Raciocínio
          </button>
          {showR && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto' }}>
              {turn.reasoning}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.6 }}>
        {turn.status === 'processing' && !turn.content && <ProcessingDots />}
        {turn.content && (
          <>
            <SimpleMarkdown text={turn.content} />
            {turn.status === 'streaming' && (
              <span style={{ display: 'inline-block', width: 2, height: 12, background: 'var(--cream)', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
            )}
          </>
        )}
        {turn.status === 'error' && (
          <span style={{ color: 'var(--err)', fontSize: 11.5 }}>{turn.error || 'Erro no cruzamento.'}</span>
        )}
      </div>
    </div>
  );
}

export function Panel({ model, status, content, reasoning, sources, unsupported, crossExams, crossTargetIds, grounding, error, onCrossExam, onRegenerate, focused }: PanelProps) {
  const [crossOpen, setCrossOpen] = useState(false);
  const [crossTarget, setCrossTarget] = useState<ModelId | null>(null);
  const crossTargets = (
    crossTargetIds
      ? crossTargetIds.map((id) => getModelById(id)).filter((m): m is ModelConfig => !!m)
      : ACTIVE_MODELS
  ).filter((m) => m.id !== model.id);

  const fireCross = (target: ModelId, action: CrossAction) => {
    onCrossExam?.(target, action);
    setCrossOpen(false);
    setCrossTarget(null);
  };

  const crossPill: CSSProperties = {
    fontSize: 11, fontWeight: 500, padding: '4px 9px', borderRadius: 5,
    background: 'var(--surface-2)', color: 'var(--cream)',
    border: '0.5px solid var(--border)', cursor: 'pointer',
    transition: 'background 0.1s',
  };

  const actionBtn: CSSProperties = {
    fontSize: 10, color: 'var(--fg-muted)',
    background: 'none', border: 'none',
    cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
    transition: 'color 0.1s',
  };

  const accent = MODEL_ACCENTS[model.id];
  const caps = MODEL_CAPABILITIES[model.id];
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const [showReasoning, setShowReasoning] = useState(false);
  useEffect(() => { setShowReasoning(readShowReasoningDefault()); }, []);

  if (model.disabled) {
    return (
      <div style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        minHeight: 180, opacity: 0.45,
      }}>
        <div style={{
          padding: '10px 12px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg-muted)' }}>
            {model.name}
          </span>
          <span style={{
            fontSize: 8.5, fontWeight: 600, letterSpacing: '0.6px',
            color: 'var(--fg-faint)', textTransform: 'uppercase',
            background: 'var(--surface-3)',
            padding: '2px 5px', borderRadius: 3,
          }}>
            Em breve
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-faint)', fontSize: 12, padding: 16,
        }}>
          Integração não disponível
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `0.5px solid ${status === 'error' ? 'color-mix(in srgb, var(--err) 40%, var(--border))' : 'var(--border)'}`,
      borderLeft: `2.5px solid ${accent}`,
      borderRadius: 10,
      display: 'flex', flexDirection: 'column',
      minHeight: focused ? 'calc(100vh - 230px)' : 180,
    }}>
      {/* header */}
      <div style={{
        padding: '9px 12px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, gap: 8,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span
            title={model.name}
            style={{
              flexShrink: 0, height: 16, padding: '0 4px', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 700, letterSpacing: '0.3px',
              background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              color: accent,
              border: `0.5px solid color-mix(in srgb, ${accent} 45%, transparent)`,
            }}
          >
            {model.name.slice(0, 2).toUpperCase()}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {model.name}
          </span>
          {grounding && caps.grounding && (
            <span style={{
              flexShrink: 0,
              fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
              color: 'var(--ok)', border: '0.5px solid var(--ok)',
              borderRadius: 3, padding: '1px 4px', opacity: 0.85,
            }}>
              WEB
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-faint)' }}>
            {caps.grounding && <span title="Pesquisa web ao vivo" style={{ display: 'flex' }}><IconGlobe /></span>}
            {caps.reasoning && <span title="Raciocínio (cadeia de pensamento)" style={{ display: 'flex' }}><IconBrain /></span>}
            {caps.vision && <span title="Visão (analisa imagens)" style={{ display: 'flex' }}><IconEye /></span>}
          </span>
          <StatusBadge status={status} />
        </span>
      </div>

      {/* reasoning disclosure — colapsado por defeito, acima da resposta */}
      {reasoning && status !== 'idle' && (
        <div style={{ borderBottom: '0.5px solid var(--border)', flexShrink: 0, background: 'var(--surface-2)' }}>
          <button
            onClick={() => setShowReasoning((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              width: '100%', padding: '7px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fg-muted)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}
            title={showReasoning ? 'Ocultar raciocínio' : 'Mostrar raciocínio'}
          >
            <span style={{ display: 'flex', transform: showReasoning ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              <IconChevron />
            </span>
            Raciocínio
          </button>
          {showReasoning && (
            <div style={{
              padding: '0 12px 10px', fontSize: 11.5,
              color: 'var(--fg-muted)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto',
            }}>
              {reasoning}
            </div>
          )}
        </div>
      )}

      {/* body */}
      <div style={{
        flex: 1, padding: '12px 14px',
        fontSize: 12.5, color: 'var(--cream)',
        lineHeight: 1.65, overflow: 'hidden',
      }}>
        {unsupported && status !== 'idle' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, color: 'var(--fg-faint)',
            background: 'var(--surface-3)', border: '0.5px solid var(--border)',
            borderRadius: 5, padding: '5px 8px', marginBottom: 9, lineHeight: 1.4,
          }}>
            <span style={{ flexShrink: 0, fontSize: 11 }}>⚠</span>
            sem suporte para este anexo — respondeu só ao texto
          </div>
        )}
        {status === 'idle' && (
          <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>Aguarda…</span>
        )}
        {status === 'processing' && <ProcessingDots />}
        {(status === 'streaming' || status === 'done') && (
          content ? (
            <>
              <SimpleMarkdown text={content} />
              {status === 'streaming' && (
                <span style={{
                  display: 'inline-block', width: 2, height: 13,
                  background: 'var(--cream)',
                  marginLeft: 1, verticalAlign: 'text-bottom',
                  animation: 'blink 0.8s step-end infinite',
                }} />
              )}
            </>
          ) : status === 'streaming' ? (
            <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>a pensar…</span>
          ) : null
        )}
        {status === 'error' && (
          <span style={{ color: 'var(--err)', fontSize: 12 }}>
            {error || 'Erro ao processar resposta.'}
          </span>
        )}
      </div>

      {/* sources — fontes web clicáveis */}
      {sources && sources.length > 0 && (
        <div style={{
          padding: '8px 12px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 4,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>
            Fontes
          </div>
          {sources.slice(0, 6).map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              title={src.url}
              style={{
                fontSize: 10.5, color: 'var(--fg-muted)',
                textDecoration: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
            >
              {i + 1}. {src.title || src.url}
            </a>
          ))}
        </div>
      )}

      {/* cross-exam turns — críticas recebidas de outros modelos */}
      {crossExams?.map((t) => <CrossExamTurnView key={t.id} turn={t} />)}

      {/* cross-exam picker (alvo → acção) */}
      {crossOpen && onCrossExam && (
        <div style={{ borderTop: '0.5px solid var(--border)', padding: '9px 12px', flexShrink: 0, background: 'var(--surface-3)' }}>
          {!crossTarget ? (
            <>
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: 7 }}>
                Cruzar com
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {crossTargets.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCrossTarget(m.id)}
                    style={crossPill}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <button
                  onClick={() => setCrossTarget(null)}
                  title="Voltar"
                  style={{ fontSize: 12, lineHeight: 1, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ←
                </button>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
                  {getModelById(crossTarget)?.name ?? crossTarget}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {CROSS_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => fireCross(crossTarget, a.id)}
                    style={crossPill}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* footer / acções */}
      {(status === 'done' || status === 'error') && (
        <div style={{
          padding: '7px 12px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
            {status === 'done' ? `${wordCount} palavras` : 'Falhou'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Regenerar apenas este painel"
                style={actionBtn}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--cream)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'}
              >
                ↻ Regenerar
              </button>
            )}
            {status === 'done' && onCrossExam && (
              <button
                onClick={() => { setCrossOpen((v) => !v); setCrossTarget(null); }}
                title="Cruzar: enviar esta resposta a outro modelo"
                style={{ ...actionBtn, color: crossOpen ? 'var(--cream)' : 'var(--fg-muted)' }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--cream)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = crossOpen ? 'var(--cream)' : 'var(--fg-muted)'}
              >
                ⇄ Cruzar
              </button>
            )}
            {status === 'done' && (
              <button
                onClick={() => navigator.clipboard.writeText(content)}
                style={actionBtn}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--cream)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'}
              >
                Copiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
