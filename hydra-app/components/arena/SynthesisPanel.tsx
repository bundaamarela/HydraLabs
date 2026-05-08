'use client';

import type { PanelStatus } from './Panel';

interface SynthesisPanelProps {
  status: PanelStatus;
  content: string;
}

interface SynthesisBlock {
  type: 'CONSENSO' | 'DIVERGÊNCIA' | 'INSIGHT' | 'body';
  text: string;
}

const BLOCK_COLORS: Record<string, { border: string; label: string }> = {
  CONSENSO:   { border: 'var(--ok)',  label: 'Consenso'   },
  DIVERGÊNCIA: { border: '#C0A050',   label: 'Divergência' },
  INSIGHT:    { border: '#5A7AB0',   label: 'Insight'     },
};

function parseSynthesis(text: string): SynthesisBlock[] {
  const lines = text.split('\n');
  const blocks: SynthesisBlock[] = [];
  let currentType: SynthesisBlock['type'] = 'body';
  let currentLines: string[] = [];

  const flush = () => {
    const t = currentLines.join('\n').trim();
    if (t) blocks.push({ type: currentType, text: t });
    currentLines = [];
  };

  for (const line of lines) {
    const heading = line.replace(/^##\s*/, '').trim().toUpperCase();
    if (heading === 'CONSENSO' || heading === 'DIVERGÊNCIA' || heading === 'INSIGHT') {
      flush();
      currentType = heading as SynthesisBlock['type'];
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return blocks;
}

function ProcessingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--fg-faint)', display: 'inline-block',
          animation: `dotpulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export function SynthesisPanel({ status, content }: SynthesisPanelProps) {
  if (status === 'idle') return null;

  const blocks = status === 'done' ? parseSynthesis(content) : [];
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleExportText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sintese.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      margin: '0 16px 16px',
      background: 'var(--surface-2)',
      border: '0.5px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      animation: 'panelIn 0.35s ease',
    }}>
      {/* header */}
      <div style={{
        padding: '11px 14px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)', letterSpacing: '-0.2px' }}>
            /Síntese
          </span>
          {status === 'streaming' && (
            <span style={{ fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.4px' }}>
              A SINTETIZAR
            </span>
          )}
          {status === 'done' && (
            <span style={{ fontSize: 9, color: 'var(--ok)', letterSpacing: '0.4px' }}>
              CONCLUÍDO
            </span>
          )}
        </div>
        {status === 'done' && (
          <div style={{ display: 'flex', gap: 6 }}>
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
            <button
              onClick={handleExportText}
              style={{
                fontSize: 10, color: 'var(--fg-muted)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
                transition: 'color 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--cream)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'}
            >
              Exportar .txt
            </button>
            <span style={{ fontSize: 10, color: 'var(--fg-faint)', padding: '2px 0' }}>
              {wordCount} palavras
            </span>
          </div>
        )}
      </div>

      {/* body */}
      <div style={{ padding: '14px 16px' }}>
        {status === 'processing' && <ProcessingDots />}

        {status === 'streaming' && (
          <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
            {content}
            <span style={{
              display: 'inline-block', width: 2, height: 14,
              background: 'var(--cream)',
              marginLeft: 1, verticalAlign: 'text-bottom',
              animation: 'blink 0.8s step-end infinite',
            }} />
          </div>
        )}

        {status === 'done' && blocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blocks.map((block, i) => {
              const meta = BLOCK_COLORS[block.type];
              if (!meta) {
                return (
                  <div key={i} style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
                    {block.text}
                  </div>
                );
              }
              return (
                <div key={i} style={{
                  borderLeft: `2px solid ${meta.border}`,
                  paddingLeft: 12,
                }}>
                  <div style={{
                    fontSize: 9.5, fontWeight: 600, letterSpacing: '0.6px',
                    color: meta.border, textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
                    {block.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {status === 'done' && blocks.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
            {content}
          </div>
        )}

        {status === 'error' && (
          <span style={{ fontSize: 12, color: 'var(--err)' }}>
            Erro ao gerar síntese.
          </span>
        )}
      </div>
    </div>
  );
}
