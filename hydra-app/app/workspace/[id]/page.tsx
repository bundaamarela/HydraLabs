'use client';

import {
  useEffect, useState, useRef, useCallback,
  type KeyboardEvent as RKE,
} from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/app/providers';

// ── types ─────────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'quote' | 'insight' | 'divider' | 'session-ref';

interface Block {
  id: string;
  workspaceId: string;
  type: BlockType;
  content: string | null;
  meta: string | null;
  order: number;
}

interface SessionRef {
  sessionId: string;
  title: string;
  query: string;
  mode: string;
  createdAt: string;
}

interface WorkspaceData {
  id: string;
  title: string;
  description: string | null;
  blocks: Block[];
  project: { id: string; name: string; color: string } | null;
}

interface SessionItem {
  id: string;
  title: string;
  query: string;
  mode: string;
  createdAt: string;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved';

// ── icons ─────────────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,3 5,7 9,11" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="1.5" x2="7" y2="9" />
      <polyline points="4,6.5 7,9 10,6.5" />
      <path d="M2 11h10" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 12,4" />
      <path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <rect x="3.5" y="4" width="7" height="8" rx=".8" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <line x1="6" y1="1.5" x2="6" y2="10.5" />
      <line x1="1.5" y1="6" x2="10.5" y2="6" />
    </svg>
  );
}

function IconDrag() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="3"  r="1" />
      <circle cx="4" cy="6"  r="1" />
      <circle cx="4" cy="9"  r="1" />
      <circle cx="8" cy="3"  r="1" />
      <circle cx="8" cy="6"  r="1" />
      <circle cx="8" cy="9"  r="1" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="6" cy="6" r="4" />
      <line x1="9.2" y1="9.2" x2="12.5" y2="12.5" />
    </svg>
  );
}

// ── block type config ─────────────────────────────────────────────────────────

const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: 'heading',     label: 'Título',     icon: 'T' },
  { type: 'text',        label: 'Parágrafo',  icon: '¶' },
  { type: 'quote',       label: 'Citação',    icon: '"' },
  { type: 'insight',     label: 'Insight',    icon: '★' },
  { type: 'divider',     label: 'Divisor',    icon: '—' },
  { type: 'session-ref', label: 'Sessão',     icon: '⊞' },
];

// ── markdown export ───────────────────────────────────────────────────────────

function blocksToMarkdown(title: string, description: string | null, blocks: Block[]): string {
  const lines: string[] = [`# ${title}`];
  if (description) lines.push('', description);
  lines.push('');
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':     lines.push(`## ${b.content ?? ''}`, ''); break;
      case 'text':        lines.push(b.content ?? '', ''); break;
      case 'quote': {
        lines.push(`> ${b.content ?? ''}`, '');
        break;
      }
      case 'insight':     lines.push(`> **INSIGHT:** ${b.content ?? ''}`, ''); break;
      case 'divider':     lines.push('---', ''); break;
      case 'session-ref': {
        try {
          const meta: SessionRef = JSON.parse(b.meta ?? '{}');
          lines.push(`[Sessão: ${meta.title ?? ''}]`, `> ${meta.query ?? ''}`, '');
        } catch { lines.push('[Referência de sessão]', ''); }
        break;
      }
    }
  }
  return lines.join('\n');
}

function downloadFile(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── session picker modal ──────────────────────────────────────────────────────

function SessionPickerModal({ onPick, onClose }: {
  onPick: (s: SessionItem) => void;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.query.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 12, padding: 0,
          width: 480, maxHeight: '70vh',
          animation: 'popIn 0.15s ease',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cream)', marginBottom: 12 }}>
            Escolher sessão
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 7, padding: '0 10px', height: 34,
          }}>
            <span style={{ color: 'var(--fg-faint)' }}><IconSearch /></span>
            <input
              autoFocus
              type="text"
              placeholder="Pesquisar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--cream)' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 8px' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>A carregar…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 12 }}>Nenhuma sessão encontrada.</div>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => { onPick(s); onClose(); }}
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 7, textAlign: 'left',
                background: 'transparent', cursor: 'pointer',
                transition: 'background 0.1s',
                marginBottom: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', marginBottom: 3 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.query}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'var(--surface-3)', color: 'var(--fg-muted)', border: '0.5px solid var(--border)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── block type picker popover ─────────────────────────────────────────────────

function BlockTypePicker({ onPick, onClose }: { onPick: (t: BlockType) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, top: 'calc(100% + 4px)',
      background: 'var(--surface-3)', border: '0.5px solid var(--border)',
      borderRadius: 8, padding: 4, zIndex: 100,
      animation: 'popIn 0.1s ease', display: 'flex', flexWrap: 'wrap',
      gap: 2, width: 200,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      {BLOCK_TYPES.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => { onPick(type); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 10px', borderRadius: 5,
            fontSize: 12, color: 'var(--cream)',
            width: '100%', textAlign: 'left',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ width: 18, textAlign: 'center', fontFamily: 'monospace', color: 'var(--fg-muted)' }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── individual block renderers ─────────────────────────────────────────────────

function EditableDiv({
  content, onSave, fontSize, fontStyle, lineHeight, color, placeholder,
}: {
  content: string;
  onSave: (v: string) => void;
  fontSize?: number;
  fontStyle?: string;
  lineHeight?: number;
  color?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== content) {
      ref.current.textContent = content;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ''}
      onInput={() => onSave(ref.current?.textContent ?? '')}
      style={{
        outline: 'none', minHeight: '1.5em',
        fontSize: fontSize ?? 14,
        lineHeight: lineHeight ?? 1.75,
        color: color ?? 'var(--cream)',
        fontStyle: (fontStyle ?? 'normal') as React.CSSProperties['fontStyle'],
        wordBreak: 'break-word',
      }}
    />
  );
}

// ── add-below button ──────────────────────────────────────────────────────────

function AddBelowButton({ onAdd }: { onAdd: (t: BlockType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--surface-3)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--fg-muted)',
          transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.color = 'var(--surface)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
        title="Adicionar bloco"
      >
        <IconPlus />
      </button>
      {open && <BlockTypePicker onPick={onAdd} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ── block wrapper ─────────────────────────────────────────────────────────────

function BlockWrapper({
  block, onDelete, onAddBelow, onDragStart, onDragOver, onDrop,
  children,
}: {
  block: Block;
  onDelete: () => void;
  onAddBelow: (t: BlockType) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => { setDragging(true); onDragStart(block.id); }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(block.id); }}
      onDrop={() => { onDrop(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        opacity: dragging ? 0.4 : 1,
        transition: 'opacity 0.15s',
        paddingLeft: 32,
        paddingRight: 32,
        marginBottom: 4,
      }}
    >
      {/* drag handle */}
      <span
        style={{
          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.12s',
          cursor: 'grab', color: 'var(--fg-faint)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <IconDrag />
      </span>

      {/* delete button */}
      {block.type !== 'divider' && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            opacity: hovered ? 1 : 0, transition: 'opacity 0.12s',
            padding: '3px', borderRadius: 4,
            color: 'var(--fg-faint)', display: 'flex', alignItems: 'center',
            transition2: 'color 0.1s',
          } as React.CSSProperties}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
          title="Apagar bloco"
        >
          <IconX />
        </button>
      )}

      {/* content */}
      {children}

      {/* add below */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.12s',
        marginTop: 4,
      }}>
        <AddBelowButton onAdd={onAddBelow} />
      </div>
    </div>
  );
}

// ── block renderers ───────────────────────────────────────────────────────────

function HeadingBlock({ block, onSave }: { block: Block; onSave: (c: string) => void }) {
  return (
    <EditableDiv
      content={block.content ?? ''}
      onSave={onSave}
      fontSize={22}
      lineHeight={1.35}
      placeholder="Título…"
    />
  );
}

function TextBlock({ block, onSave }: { block: Block; onSave: (c: string) => void }) {
  return (
    <EditableDiv
      content={block.content ?? ''}
      onSave={onSave}
      fontSize={14}
      lineHeight={1.8}
      placeholder="Escreve aqui…"
    />
  );
}

function QuoteBlock({ block, onSave }: { block: Block; onSave: (c: string) => void }) {
  return (
    <div style={{ borderLeft: '3px solid var(--border)', paddingLeft: 16 }}>
      <EditableDiv
        content={block.content ?? ''}
        onSave={onSave}
        fontSize={14}
        fontStyle="italic"
        color="var(--fg-muted)"
        lineHeight={1.65}
        placeholder="Citação…"
      />
    </div>
  );
}

function InsightBlock({ block, onSave }: { block: Block; onSave: (c: string) => void }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      borderLeft: '3px solid #F59E0B',
      borderRadius: '0 6px 6px 0',
      padding: '12px 16px',
    }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.6px', color: '#F59E0B', textTransform: 'uppercase', marginBottom: 6 }}>
        Insight
      </div>
      <EditableDiv
        content={block.content ?? ''}
        onSave={onSave}
        fontSize={13}
        lineHeight={1.65}
        placeholder="Insight…"
      />
    </div>
  );
}

function DividerBlock() {
  return <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />;
}

function SessionRefBlock({
  block, onReplace,
}: {
  block: Block;
  onReplace: () => void;
}) {
  let meta: SessionRef | null = null;
  try { meta = JSON.parse(block.meta ?? ''); } catch { /* ignore */ }

  return (
    <div style={{
      background: 'var(--surface-2)', border: '0.5px solid var(--border)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5,
          background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: 'var(--surface)', flexShrink: 0,
        }}>
          HL
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cream)', flex: 1 }}>
          {meta?.title ?? 'Sessão'}
        </span>
        {meta?.createdAt && (
          <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
            {new Date(meta.createdAt).toLocaleDateString('pt-PT')}
          </span>
        )}
      </div>
      {meta?.query && (
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
          "{meta.query.slice(0, 120)}{meta.query.length > 120 ? '…' : ''}"
        </div>
      )}
      <button
        onClick={onReplace}
        style={{
          fontSize: 11, color: 'var(--fg-muted)', padding: '3px 8px',
          borderRadius: 4, border: '0.5px solid var(--border)',
          cursor: 'pointer', transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
      >
        Trocar sessão →
      </button>
    </div>
  );
}

// ── left toolbar ──────────────────────────────────────────────────────────────

function LeftToolbar({ onAdd }: { onAdd: (t: BlockType) => void }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <div style={{
      position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
      width: 40, zIndex: 50,
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '8px 4px',
      background: 'var(--surface-2)',
      borderRight: '0.5px solid var(--border)',
      borderRadius: '0 8px 8px 0',
    }}>
      {BLOCK_TYPES.map(({ type, label, icon }) => (
        <div key={type} style={{ position: 'relative' }}>
          <button
            onClick={() => onAdd(type)}
            onMouseEnter={(e) => {
              setTooltip(type);
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--cream)';
            }}
            onMouseLeave={(e) => {
              setTooltip(null);
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)';
            }}
            style={{
              width: 32, height: 32, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontFamily: 'monospace',
              color: 'var(--fg-muted)',
              transition: 'background 0.1s, color 0.1s',
            }}
            title={label}
          >
            {icon}
          </button>
          {tooltip === type && (
            <div style={{
              position: 'absolute', left: 38, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--surface-3)', border: '0.5px solid var(--border)',
              borderRadius: 5, padding: '4px 8px',
              fontSize: 11, color: 'var(--cream)', whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 200,
            }}>
              {label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── main editor ───────────────────────────────────────────────────────────────

export default function WorkspaceEditorPage() {
  const { sidebarW } = useApp();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [workspace, setWorkspace]   = useState<WorkspaceData | null>(null);
  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc,  setEditingDesc]  = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [sessionPicker, setSessionPicker] = useState<{ resolveFor: string } | null>(null);

  const dragRef   = useRef<string | null>(null);
  const overRef   = useRef<string | null>(null);
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const exportRef = useRef<HTMLDivElement>(null);

  // fetch workspace
  useEffect(() => {
    if (!id) return;
    fetch(`/api/workspaces/${id}`)
      .then((r) => r.json())
      .then((data: WorkspaceData) => {
        setWorkspace(data);
        setBlocks(data.blocks ?? []);
        setSaveStatus('saved');
      })
      .catch(() => {});
  }, [id]);

  // close export on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // debounced save for a single block
  const scheduleSave = useCallback((blockId: string, content: string) => {
    setSaveStatus('unsaved');
    const existing = saveTimers.current.get(blockId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      setSaveStatus('saving');
      await fetch(`/api/workspaces/${id}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      saveTimers.current.delete(blockId);
      if (saveTimers.current.size === 0) setSaveStatus('saved');
    }, 1000);
    saveTimers.current.set(blockId, t);
  }, [id]);

  function updateBlockContent(blockId: string, content: string) {
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, content } : b));
    scheduleSave(blockId, content);
  }

  // add block (appended or at the end)
  async function addBlock(type: BlockType, afterId?: string) {
    const afterIdx  = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
    const newOrder  = afterIdx >= 0 ? blocks[afterIdx].order + 0.5 : blocks.length;

    if (type === 'session-ref') {
      // must pick a session first — store pending position
      setSessionPicker({ resolveFor: afterId ?? '__end__' });
      return;
    }

    const res = await fetch(`/api/workspaces/${id}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content: type === 'divider' ? null : '', order: newOrder }),
    });
    const newBlock: Block = await res.json();

    setBlocks((prev) => {
      const next = afterId
        ? [...prev.slice(0, afterIdx + 1), newBlock, ...prev.slice(afterIdx + 1)]
        : [...prev, newBlock];
      return renormalizeOrder(next);
    });
  }

  async function handleSessionPicked(session: SessionItem) {
    const afterId  = sessionPicker?.resolveFor === '__end__' ? undefined : sessionPicker?.resolveFor;
    const afterIdx = afterId ? blocks.findIndex((b) => b.id === afterId) : blocks.length - 1;
    const newOrder = afterIdx >= 0 ? blocks[afterIdx].order + 0.5 : blocks.length;

    const meta: SessionRef = {
      sessionId: session.id,
      title:     session.title,
      query:     session.query,
      mode:      session.mode,
      createdAt: session.createdAt,
    };

    const res = await fetch(`/api/workspaces/${id}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'session-ref', meta: JSON.stringify(meta), order: newOrder }),
    });
    const newBlock: Block = await res.json();

    setBlocks((prev) => {
      const next = afterId
        ? [...prev.slice(0, afterIdx + 1), newBlock, ...prev.slice(afterIdx + 1)]
        : [...prev, newBlock];
      return renormalizeOrder(next);
    });
    setSessionPicker(null);
  }

  async function deleteBlock(blockId: string) {
    await fetch(`/api/workspaces/${id}/blocks/${blockId}`, { method: 'DELETE' });
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  // drag-and-drop reorder
  function onDragStart(blockId: string) { dragRef.current = blockId; }
  function onDragOver(blockId: string)  { overRef.current = blockId; }

  async function onDrop() {
    const from = dragRef.current;
    const to   = overRef.current;
    if (!from || !to || from === to) return;

    setBlocks((prev) => {
      const fromIdx = prev.findIndex((b) => b.id === from);
      const toIdx   = prev.findIndex((b) => b.id === to);
      const next    = [...prev];
      const [item]  = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return renormalizeOrder(next);
    });

    // persist reorder
    const updated = blocks.map((b, i) => ({ id: b.id, order: i }));
    await fetch(`/api/workspaces/${id}/blocks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: updated }),
    });
    dragRef.current = null;
    overRef.current = null;
  }

  function renormalizeOrder(arr: Block[]): Block[] {
    return arr.map((b, i) => ({ ...b, order: i }));
  }

  // title / description save
  async function saveTitle(title: string) {
    if (!workspace) return;
    setWorkspace((w) => w ? { ...w, title } : w);
    setSaveStatus('saving');
    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSaveStatus('saved');
  }

  async function saveDescription(description: string) {
    if (!workspace) return;
    setWorkspace((w) => w ? { ...w, description } : w);
    setSaveStatus('saving');
    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setSaveStatus('saved');
  }

  // export
  function handleExportMD() {
    if (!workspace) return;
    const md = blocksToMarkdown(workspace.title, workspace.description, blocks);
    const slug = workspace.title.slice(0, 40).replace(/\s+/g, '-').toLowerCase();
    downloadFile(md, `workspace-${slug}.md`, 'text/markdown');
    setExportOpen(false);
  }

  function handlePrint() {
    window.print();
    setExportOpen(false);
  }

  if (!workspace) {
    return (
      <div style={{ marginLeft: sidebarW + 40, padding: 32, color: 'var(--fg-muted)', fontSize: 13 }}>
        A carregar workspace…
      </div>
    );
  }

  const saveLabel = saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'A guardar…' : '●';

  return (
    <>
      {/* left toolbar */}
      <LeftToolbar onAdd={(t) => addBlock(t)} />

      <main style={{
        marginLeft: sidebarW + 40,
        minHeight: '100vh',
        paddingBottom: 80,
        maxWidth: 780,
        margin: `0 auto 0 ${sidebarW + 40}px`,
        transition: 'margin-left 0.2s ease',
      }}>

        {/* ── header ── */}
        <div style={{
          padding: '20px 32px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '0.5px solid var(--border)',
          marginBottom: 28,
        }}>
          {/* breadcrumb + back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => router.push('/workspace')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-muted)', fontSize: 12, padding: '4px 0' }}
            >
              <IconArrowLeft /> Workspaces
            </button>
            <span style={{ color: 'var(--fg-faint)', fontSize: 12 }}>›</span>
            <span style={{ fontSize: 12, color: 'var(--cream)' }}>{workspace.title}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
            {/* save status */}
            <span style={{
              fontSize: 11, color: saveStatus === 'saved' ? 'var(--ok)' : saveStatus === 'saving' ? 'var(--fg-muted)' : 'var(--fg-faint)',
              transition: 'color 0.3s',
            }}>
              {saveLabel}
            </span>

            {/* export button */}
            <div ref={exportRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7,
                  background: exportOpen ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  color: 'var(--fg-muted)', fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <IconDownload /> Exportar ↓
              </button>
              {exportOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                  background: 'var(--surface-3)', border: '0.5px solid var(--border)',
                  borderRadius: 8, padding: 4, zIndex: 100,
                  animation: 'popIn 0.1s ease', minWidth: 160,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                  {[
                    { label: 'Markdown (.md)', fn: handleExportMD },
                    { label: 'Imprimir / PDF', fn: handlePrint },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn} style={{ width: '100%', padding: '7px 10px', borderRadius: 5, fontSize: 12, color: 'var(--cream)', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── title + description ── */}
        <div style={{ padding: '0 32px', marginBottom: 24 }}>
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={workspace.title}
              onBlur={(e) => { saveTitle(e.target.value); setEditingTitle(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { saveTitle((e.target as HTMLInputElement).value); setEditingTitle(false); } }}
              style={{
                fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px',
                color: 'var(--cream)', background: 'none', border: 'none',
                outline: 'none', width: '100%', marginBottom: 4,
              }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px',
                color: 'var(--cream)', cursor: 'text', marginBottom: 4,
                padding: '2px 0',
              }}
            >
              {workspace.title}
            </h1>
          )}

          {editingDesc ? (
            <input
              autoFocus
              defaultValue={workspace.description ?? ''}
              placeholder="Adiciona uma descrição…"
              onBlur={(e) => { saveDescription(e.target.value); setEditingDesc(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { saveDescription((e.target as HTMLInputElement).value); setEditingDesc(false); } }}
              style={{
                fontSize: 14, color: 'var(--fg-muted)',
                background: 'none', border: 'none', outline: 'none', width: '100%',
              }}
            />
          ) : (
            <p
              onClick={() => setEditingDesc(true)}
              style={{ fontSize: 14, color: 'var(--fg-muted)', cursor: 'text', minHeight: 22 }}
            >
              {workspace.description || <span style={{ color: 'var(--fg-faint)' }}>Adiciona uma descrição…</span>}
            </p>
          )}
        </div>

        {/* ── blocks ── */}
        <div style={{ padding: '0 32px' }}>
          {blocks.length === 0 && (
            <div style={{
              padding: '40px 0', textAlign: 'center',
              color: 'var(--fg-faint)', fontSize: 13,
              animation: 'fadeSlideUp 0.3s ease',
            }}>
              <div style={{ marginBottom: 12 }}>Workspace vazio.</div>
              <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
                Usa a barra lateral esquerda para adicionar o primeiro bloco.
              </div>
            </div>
          )}

          {blocks.map((block) => (
            <BlockWrapper
              key={block.id}
              block={block}
              onDelete={() => deleteBlock(block.id)}
              onAddBelow={(t) => addBlock(t, block.id)}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              {block.type === 'heading' && (
                <HeadingBlock block={block} onSave={(c) => updateBlockContent(block.id, c)} />
              )}
              {block.type === 'text' && (
                <TextBlock block={block} onSave={(c) => updateBlockContent(block.id, c)} />
              )}
              {block.type === 'quote' && (
                <QuoteBlock block={block} onSave={(c) => updateBlockContent(block.id, c)} />
              )}
              {block.type === 'insight' && (
                <InsightBlock block={block} onSave={(c) => updateBlockContent(block.id, c)} />
              )}
              {block.type === 'divider' && (
                <DividerBlock />
              )}
              {block.type === 'session-ref' && (
                <SessionRefBlock
                  block={block}
                  onReplace={() => setSessionPicker({ resolveFor: block.id })}
                />
              )}
            </BlockWrapper>
          ))}

          {/* add first block if empty shortcut */}
          {blocks.length > 0 && (
            <div style={{ padding: '8px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BLOCK_TYPES.filter((bt) => bt.type !== 'session-ref').map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 11,
                    color: 'var(--fg-faint)', border: '0.5px dashed var(--border)',
                    background: 'transparent', cursor: 'pointer',
                    transition: 'color 0.1s, border-color 0.1s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--fg-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ fontFamily: 'monospace' }}>{icon}</span> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* session picker modal */}
      {sessionPicker && (
        <SessionPickerModal
          onPick={handleSessionPicked}
          onClose={() => setSessionPicker(null)}
        />
      )}
    </>
  );
}
