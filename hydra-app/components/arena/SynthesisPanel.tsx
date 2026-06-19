'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/app/providers';
import { SimpleMarkdown, type PanelStatus } from './Panel';

interface SynthesisPanelProps {
  status: PanelStatus;
  content: string;
}

interface SynthesisBlock {
  type: 'CONSENSO' | 'DIVERGÊNCIA' | 'INSIGHT' | 'body';
  text: string;
}

const BLOCK_COLORS: Record<string, { border: string; label: string }> = {
  CONSENSO:    { border: 'var(--cream)',    label: 'Consenso'    },
  DIVERGÊNCIA: { border: 'var(--fg-muted)', label: 'Divergência' },
  INSIGHT:     { border: 'var(--fg-faint)', label: 'Insight'     },
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

// ── add-to-workspace modal ────────────────────────────────────────────────────

interface WorkspaceItem { id: string; title: string; _count: { blocks: number } }

function AddToWorkspaceModal({ synthesisContent, onClose }: {
  synthesisContent: string;
  onClose: () => void;
}) {
  const { activeSessionId } = useApp();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding]     = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => { setWorkspaces(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addToWorkspace(workspaceId: string) {
    setAdding(true);
    const maxOrder = 1000;

    // Add insight block with synthesis text
    await fetch(`/api/workspaces/${workspaceId}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'insight', content: synthesisContent, order: maxOrder }),
    });

    // If we have the session ID, add a session-ref block too
    if (activeSessionId) {
      try {
        const sessRes = await fetch(`/api/sessions/${activeSessionId}`);
        const sess = await sessRes.json();
        const meta = JSON.stringify({
          sessionId: sess.id, title: sess.title,
          query: sess.query, mode: sess.mode, createdAt: sess.createdAt,
        });
        await fetch(`/api/workspaces/${workspaceId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'session-ref', meta, order: maxOrder - 1 }),
        });
      } catch { /* non-fatal */ }
    }

    setAdding(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  async function handleCreateAndAdd() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    const ws = await res.json();
    setCreating(false);
    await addToWorkspace(ws.id);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 12, padding: '24px 28px',
          width: 380, animation: 'popIn 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 13, color: 'var(--ok)' }}>Adicionado ao workspace</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)', marginBottom: 16 }}>
              Adicionar ao Workspace
            </div>

            {loading ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: 12, marginBottom: 16 }}>A carregar…</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => addToWorkspace(ws.id)}
                    disabled={adding}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 7,
                      textAlign: 'left', marginBottom: 4,
                      background: 'var(--surface)', border: '0.5px solid var(--border)',
                      cursor: 'pointer', transition: 'border-color 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--fg-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)' }}>{ws.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-faint)', marginTop: 2 }}>{ws._count.blocks} blocos</div>
                  </button>
                ))}
                {workspaces.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>Nenhum workspace. Cria um abaixo.</div>
                )}
              </div>
            )}

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>Ou cria novo workspace:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Título do workspace"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); }}
                  style={{
                    flex: 1, padding: '7px 10px',
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: 6, fontSize: 12, color: 'var(--cream)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newTitle.trim() || creating || adding}
                  style={{
                    padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: newTitle.trim() ? 'var(--cream)' : 'var(--surface-3)',
                    color: newTitle.trim() ? 'var(--surface)' : 'var(--fg-faint)',
                    border: 'none', cursor: newTitle.trim() ? 'pointer' : 'default',
                  }}
                >
                  Criar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function SynthesisPanel({ status, content }: SynthesisPanelProps) {
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  if (status === 'idle') return null;

  const blocks    = status === 'done' ? parseSynthesis(content) : [];
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleExportText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'sintese.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
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
              <span style={{ fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.4px' }}>A SINTETIZAR</span>
            )}
            {status === 'done' && (
              <span style={{ fontSize: 9, color: 'var(--ok)', letterSpacing: '0.4px' }}>CONCLUÍDO</span>
            )}
          </div>
          {status === 'done' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => navigator.clipboard.writeText(content)}
                style={{ fontSize: 10, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, transition: 'color 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
              >
                Copiar
              </button>
              <button
                onClick={handleExportText}
                style={{ fontSize: 10, color: 'var(--fg-muted)', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, transition: 'color 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
              >
                Exportar .txt
              </button>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                style={{
                  fontSize: 10, color: 'var(--fg-muted)', cursor: 'pointer',
                  padding: '2px 8px', borderRadius: 3,
                  border: '0.5px solid var(--border)',
                  transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--fg-muted)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                → Workspace
              </button>
              <span style={{ fontSize: 10, color: 'var(--fg-faint)', padding: '2px 0' }}>
                {wordCount} palavras
              </span>
            </div>
          )}
        </div>

        {/* body */}
        <div className="read" style={{ padding: '14px 16px' }}>
          {status === 'processing' && <ProcessingDots />}

          {status === 'streaming' && (
            <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
              {content}
              <span style={{
                display: 'inline-block', width: 2, height: 14,
                background: 'var(--cream)', marginLeft: 1, verticalAlign: 'text-bottom',
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
                      <SimpleMarkdown text={block.text} />
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ borderLeft: `2px solid ${meta.border}`, paddingLeft: 12 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.6px', color: meta.border, textTransform: 'uppercase', marginBottom: 6 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
                      <SimpleMarkdown text={block.text} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {status === 'done' && blocks.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.7 }}>
              <SimpleMarkdown text={content} />
            </div>
          )}

          {status === 'error' && (
            <span style={{ fontSize: 12, color: 'var(--err)' }}>Erro ao gerar síntese.</span>
          )}
        </div>
      </div>

      {showWorkspaceModal && (
        <AddToWorkspaceModal
          synthesisContent={content}
          onClose={() => setShowWorkspaceModal(false)}
        />
      )}
    </>
  );
}
