'use client';

import { QueryBubble } from './QueryBubble';
import { SimpleMarkdown } from './Panel';
import { getModelById, MODEL_ACCENTS, type ModelId } from '@/lib/models';

/** Um turno concluído da conversa (pergunta + resposta por modelo). */
export interface ConvTurn {
  query: string;
  answers: Partial<Record<ModelId, string>>;
}

// Renderização só-leitura dos turnos anteriores (acima da ronda interativa).
export function PastTurn({ turn, density, isMobile }: {
  turn: ConvTurn;
  density: 2 | 3 | 6;
  isMobile: boolean;
}) {
  const entries = Object.entries(turn.answers).filter(([, v]) => v) as [ModelId, string][];
  if (entries.length === 0) return <QueryBubble query={turn.query} />;

  const cols = isMobile ? 1 : Math.min(density, Math.max(entries.length, 1));

  return (
    <div style={{ opacity: 0.82 }}>
      <QueryBubble query={turn.query} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 10, padding: '0 16px 12px',
      }}>
        {entries.map(([id, content]) => {
          const m = getModelById(id);
          if (!m) return null;
          const accent = MODEL_ACCENTS[id];
          return (
            <div key={id} style={{
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border)',
              borderLeft: `2.5px solid ${accent}`,
              borderRadius: 10, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                padding: '8px 12px', borderBottom: '0.5px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
              }}>
                <span style={{
                  flexShrink: 0, height: 16, padding: '0 4px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8.5, fontWeight: 700, letterSpacing: '0.3px',
                  background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                  color: accent,
                  border: `0.5px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cream)' }}>{m.name}</span>
              </div>
              <div className="read" style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.6 }}>
                <SimpleMarkdown text={content} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
