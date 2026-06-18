'use client';

import { useEffect, useState } from 'react';
import type { ModelConfig } from '@/lib/models';

export type PanelStatus = 'idle' | 'processing' | 'streaming' | 'done' | 'error';

interface PanelProps {
  model: ModelConfig;
  status: PanelStatus;
  content: string;
  reasoning?: string;
  error?: string;
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

export function Panel({ model, status, content, reasoning, error }: PanelProps) {
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
      borderRadius: 10,
      display: 'flex', flexDirection: 'column',
      minHeight: 180,
    }}>
      {/* header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cream)' }}>
          {model.name}
        </span>
        <StatusBadge status={status} />
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

      {/* footer */}
      {status === 'done' && (
        <div style={{
          padding: '7px 12px',
          borderTop: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
            {wordCount} palavras
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(content)}
            style={{
              fontSize: 10, color: 'var(--fg-muted)',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
              transition: 'color 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--cream)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'}
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}
