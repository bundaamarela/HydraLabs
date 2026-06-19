'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/providers';
import { PageFrame } from '@/components/layout/PageFrame';
import { EmptyState } from '@/components/ui/EmptyState';

// ── types ─────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: string;
  title: string;
  query: string;
  mode: string;
  voices: number;
  createdAt: string;
}

interface SessionDetail extends SessionItem {
  synthesis: string | null;
  notes: string | null;
  responses: { model: string; content: string }[];
  crossExams?: { sourceModel: string; targetModel: string; action: string; content: string }[];
  tags: { name: string }[];
}

interface ProjectItem {
  id: string;
  name: string;
  color: string;
  _count: { sessions: number };
}

const MODES = ['rapido', 'raciocinio', 'pesquisa', 'investigacao', 'direto', 'consolidacao', 'sintese'] as const;
type ModeFilter = (typeof MODES)[number] | 'todos';

const MODE_LABELS: Record<string, string> = {
  rapido:       'Rápido',
  raciocinio:   'Raciocínio',
  pesquisa:     'Pesquisa',
  investigacao: 'Investigação',
  direto:       'Directo',
  consolidacao: 'Consolidação',
  sintese:      'Síntese',
};

// ── icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="6" cy="6" r="4" />
      <line x1="9.2" y1="9.2" x2="12.5" y2="12.5" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 12,4" />
      <path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
      <rect x="3.5" y="4" width="7" height="8" rx=".8" />
      <line x1="5.5" y1="7" x2="5.5" y2="10" />
      <line x1="8.5" y1="7" x2="8.5" y2="10" />
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

function IconX() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <line x1="2" y1="2" x2="10" y2="10" />
      <line x1="10" y1="2" x2="2" y2="10" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <polyline points="7,4 7,7 9,9" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx=".8" />
      <rect x="8"   y="1.5" width="4.5" height="4.5" rx=".8" />
      <rect x="1.5" y="8"   width="4.5" height="4.5" rx=".8" />
      <rect x="8"   y="8"   width="4.5" height="4.5" rx=".8" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
      <line x1="2" y1="4"  x2="12" y2="4"  />
      <line x1="2" y1="7"  x2="12" y2="7"  />
      <line x1="2" y1="10" x2="12" y2="10" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 1.5H11.5a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V4Z" />
    </svg>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoje, ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ontem, ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function exportMarkdown(session: SessionDetail) {
  const lines: string[] = [
    `# ${session.title}`, '',
    `**Modo:** ${MODE_LABELS[session.mode] ?? session.mode}  `,
    `**Data:** ${new Date(session.createdAt).toLocaleString('pt-PT')}  `,
    `**Vozes:** ${session.voices}`, '', '---', '', '## Consulta', '', session.query, '',
  ];
  if (session.responses.length > 0) {
    lines.push('---', '', '## Respostas', '');
    for (const r of session.responses) lines.push(`### ${r.model}`, '', r.content, '');
  }
  if (session.crossExams && session.crossExams.length > 0) {
    lines.push('---', '', '## Cruzamentos', '');
    for (const c of session.crossExams) {
      lines.push(`### ${c.targetModel} ${c.action} → ${c.sourceModel}`, '', c.content, '');
    }
  }
  if (session.synthesis) lines.push('---', '', '## Síntese', '', session.synthesis, '');
  if (session.notes)     lines.push('---', '', '## Notas',   '', session.notes,     '');
  return lines.join('\n');
}

function exportJSON(session: SessionDetail) {
  return JSON.stringify(session, null, 2);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Bug 1: export popover with position:fixed using portal ────────────────────

interface ExportPopoverProps {
  session: SessionDetail;
  anchorRect: DOMRect;
  onClose: () => void;
}

function ExportPopoverFixed({ session, anchorRect, onClose }: ExportPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const slug = session.title.slice(0, 40).replace(/\s+/g, '-').toLowerCase();

  const POPOVER_H = 80; // approximate height
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward = spaceBelow < POPOVER_H + 16;

  const top    = openUpward ? anchorRect.top - POPOVER_H - 4 : anchorRect.bottom + 4;
  const right  = window.innerWidth - anchorRect.right;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed',
      top, right,
      background: 'var(--surface-3)',
      border: '0.5px solid var(--border)',
      borderRadius: 8, padding: 4,
      zIndex: 9999,
      animation: 'popIn 0.1s ease',
      minWidth: 148,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {([
        { label: 'Exportar .md',   ext: 'md',   mime: 'text/markdown',       fn: exportMarkdown },
        { label: 'Exportar .json', ext: 'json', mime: 'application/json',    fn: exportJSON     },
      ] as const).map(({ label, ext, mime, fn }) => (
        <button
          key={ext}
          onClick={() => { downloadFile(fn(session), `hydra-${slug}.${ext}`, mime); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 10px', borderRadius: 5, fontSize: 12,
            color: 'var(--cream)', transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <IconDownload /> {label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

// Loading + connected popover (fetches session detail on demand)
function ExportButton({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<{ rect: DOMRect; detail: SessionDetail | null } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = !!state;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setState(null); return; }
    const rect = btnRef.current!.getBoundingClientRect();
    setState({ rect, detail: null });
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((detail: SessionDetail) => setState((s) => s ? { ...s, detail } : null))
      .catch(() => setState(null));
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        style={{
          padding: '4px 7px', borderRadius: 5,
          color: 'var(--fg-muted)',
          display: 'flex', alignItems: 'center',
          background: open ? 'var(--surface)' : 'transparent',
          border: '0.5px solid ' + (open ? 'var(--border)' : 'transparent'),
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--surface)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        title="Exportar"
      >
        <IconDownload />
      </button>
      {state && state.detail && (
        <ExportPopoverFixed
          session={state.detail}
          anchorRect={state.rect}
          onClose={() => setState(null)}
        />
      )}
      {state && !state.detail && (
        /* Loading indicator in portal */
        createPortal(
          <div style={{
            position: 'fixed',
            top: state.rect.bottom + 4,
            right: window.innerWidth - state.rect.right,
            background: 'var(--surface-3)',
            border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
            zIndex: 9999, fontSize: 11, color: 'var(--fg-muted)',
            minWidth: 148,
          }}>
            A carregar…
          </div>,
          document.body,
        )
      )}
    </>
  );
}

// ── delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({ title, onConfirm, onCancel }: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 12, padding: '24px 28px',
        maxWidth: 380, width: '90%',
        animation: 'popIn 0.15s ease',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: 'var(--cream)' }}>
          Apagar sessão?
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          "{title}" será apagada permanentemente. Esta acção não pode ser desfeita.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: 'var(--surface-3)', color: 'var(--fg-muted)',
              border: '0.5px solid var(--border)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: 'var(--err)', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bug 2: ProjectSidebar ─────────────────────────────────────────────────────

function ProjectSidebar({
  projects,
  selected,
  onSelect,
  totalCount,
}: {
  projects: ProjectItem[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  totalCount: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const all = selected === null;

  return (
    <aside style={{
      width: 180, flexShrink: 0,
      borderRight: '0.5px solid var(--border)',
      paddingTop: 24,
      height: '100%', overflowY: 'auto',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 500,
        color: 'var(--fg-faint)', letterSpacing: '0.8px',
        textTransform: 'uppercase',
        padding: '0 12px 10px',
      }}>
        Projectos
      </div>

      {/* All sessions */}
      <button
        onClick={() => onSelect(null)}
        onMouseEnter={() => setHovered('all')}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '7px 12px',
          borderRadius: 6, margin: '0 0 1px',
          background: all ? 'var(--surface-3)' : hovered === 'all' ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: all ? 'var(--cream)' : 'var(--fg-muted)',
          fontSize: 12, fontWeight: all ? 500 : 400,
          transition: 'background 0.1s, color 0.1s',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--fg-faint)' }}>
          <IconFolder />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Todas as sessões
        </span>
        <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{totalCount}</span>
      </button>

      {/* Projects */}
      {projects.map((p) => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 12px',
              borderRadius: 6, margin: '0 0 1px',
              background: active ? 'var(--surface-3)' : hovered === p.id ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: active ? 'var(--cream)' : 'var(--fg-muted)',
              fontSize: 12, fontWeight: active ? 500 : 400,
              transition: 'background 0.1s, color 0.1s',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: p.color, flexShrink: 0,
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{p._count.sessions}</span>
          </button>
        );
      })}
    </aside>
  );
}

// ── session card ──────────────────────────────────────────────────────────────

function SessionCard({ session, onDelete }: {
  session: SessionItem;
  onDelete: (id: string, title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      style={{
        background: hovered ? 'var(--surface-3)' : 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10, padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
        animation: 'panelIn 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push('/')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 500, color: 'var(--fg-muted)',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 4, padding: '2px 7px', letterSpacing: '0.3px', textTransform: 'uppercase',
        }}>
          {MODE_LABELS[session.mode] ?? session.mode}
        </span>

        <div
          style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExportButton sessionId={session.id} />
          <button
            style={{
              padding: '4px 7px', borderRadius: 5,
              color: 'var(--fg-muted)', display: 'flex', alignItems: 'center',
              transition: 'color 0.1s, background 0.1s',
            }}
            onClick={() => onDelete(session.id, session.title)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--err)';
              e.currentTarget.style.background = 'rgba(192,112,90,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Apagar"
          >
            <IconTrash />
          </button>
        </div>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 500, color: 'var(--cream)', marginBottom: 6,
        overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        lineHeight: 1.45,
      }}>
        {session.title}
      </div>

      {session.query !== session.title && (
        <div style={{
          fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 8,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          lineHeight: 1.5,
        }}>
          {session.query}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, color: 'var(--fg-faint)', marginTop: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconClock /> {formatDate(session.createdAt)}
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{session.voices} vozes</span>
      </div>
    </div>
  );
}

// ── session row ───────────────────────────────────────────────────────────────

function SessionRow({ session, onDelete }: {
  session: SessionItem;
  onDelete: (id: string, title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 14px', borderRadius: 8,
        cursor: 'pointer',
        background: hovered ? 'var(--surface-3)' : 'transparent',
        transition: 'background 0.12s', gap: 12,
        borderBottom: '0.5px solid var(--border)',
        animation: 'panelIn 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push('/')}
    >
      <span style={{
        fontSize: 10, fontWeight: 500, color: 'var(--fg-muted)',
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 4, padding: '2px 7px', letterSpacing: '0.3px', textTransform: 'uppercase',
        flexShrink: 0, minWidth: 90, textAlign: 'center',
      }}>
        {MODE_LABELS[session.mode] ?? session.mode}
      </span>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: 'var(--cream)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {session.title}
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--fg-faint)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
        <IconClock /> {formatDate(session.createdAt)}
      </div>

      <div
        style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExportButton sessionId={session.id} />
        <button
          style={{ padding: '4px 7px', borderRadius: 5, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
          onClick={() => onDelete(session.id, session.title)}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
          title="Apagar"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { isMobile } = useApp();
  const [sessions, setSessions]     = useState<SessionItem[]>([]);
  const [projects, setProjects]     = useState<ProjectItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('todos');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // fetch projects (once)
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  const fetchSessions = useCallback(() => {
    const params = new URLSearchParams();
    if (search)                  params.set('q', search);
    if (modeFilter !== 'todos')  params.set('mode', modeFilter);
    const qs = params.toString();
    setLoading(true);
    fetch(`/api/sessions${qs ? '?' + qs : ''}`)
      .then((r) => r.json())
      .then((data: SessionItem[]) => {
        setSessions(
          projectFilter
            ? data.filter((s) => (s as SessionItem & { projectId?: string }).projectId === projectFilter)
            : data,
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, modeFilter, projectFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const totalCount   = sessions.length;
  const allCount     = sessions.length; // before project filter would give total, but we keep it simple
  const searchActive = search.trim().length > 0 || modeFilter !== 'todos' || projectFilter !== null;

  return (
    <PageFrame
      scroll={false}
      title={
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)', letterSpacing: '-0.3px', margin: 0 }}>
            Biblioteca
          </h1>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loading ? 'A carregar…' : `${totalCount} ${totalCount === 1 ? 'sessão' : 'sessões'}${searchActive ? ' (filtradas)' : ''}`}
          </span>
        </div>
      }
      actions={
        <div style={{
          display: 'flex', background: 'var(--surface-2)',
          border: '0.5px solid var(--border)', borderRadius: 7, padding: 2, gap: 2,
        }}>
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '5px 9px', borderRadius: 5, display: 'flex', alignItems: 'center',
                background: viewMode === v ? 'var(--surface-3)' : 'transparent',
                color:      viewMode === v ? 'var(--cream)' : 'var(--fg-muted)',
                transition: 'background 0.12s, color 0.12s',
              }}
              title={v === 'grid' ? 'Grelha' : 'Lista'}
            >
              {v === 'grid' ? <IconGrid /> : <IconList />}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* ── project sidebar (hidden on mobile to free width) ── */}
        {!isMobile && (
          <ProjectSidebar
            projects={projects}
            selected={projectFilter}
            onSelect={setProjectFilter}
            totalCount={allCount}
          />
        )}

        {/* ── main content (only this column scrolls) ── */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: isMobile ? '8px 16px 64px' : '24px 32px 64px' }}>

        {/* toolbar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-2)', border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '0 12px',
            flex: '1 1 220px', maxWidth: 360, height: 36,
          }}>
            <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}><IconSearch /></span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Pesquisar sessões… (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: 'var(--cream)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--fg-faint)', display: 'flex', alignItems: 'center' }}>
                <IconX />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['todos', ...MODES] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                  background: modeFilter === m ? 'var(--cream)' : 'var(--surface-2)',
                  color:      modeFilter === m ? 'var(--surface)' : 'var(--fg-muted)',
                  border:     '0.5px solid ' + (modeFilter === m ? 'transparent' : 'var(--border)'),
                  transition: 'background 0.12s, color 0.12s', cursor: 'pointer',
                }}
              >
                {m === 'todos' ? 'Todos' : MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* empty state */}
        {!loading && sessions.length === 0 && (
          searchActive ? (
            <EmptyState
              icon={<IconSearch />}
              title="Nenhum resultado"
              description="Tenta outros termos ou remove os filtros."
              action={{ label: 'Limpar filtros', onClick: () => { setSearch(''); setModeFilter('todos'); setProjectFilter(null); } }}
            />
          ) : (
            <EmptyState
              icon={<IconSearch />}
              title="Biblioteca vazia"
              description="Faz uma consulta na Arena para guardar sessões."
              action={{ label: 'Ir para a Arena', href: '/' }}
            />
          )
        )}

        {/* loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' : '1fr', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                background: 'var(--surface-2)', border: '0.5px solid var(--border)',
                borderRadius: 10, height: viewMode === 'grid' ? 120 : 52,
                opacity: 0.5, animation: `panelIn 0.2s ease ${i * 0.05}s both`,
              }} />
            ))}
          </div>
        )}

        {/* grid view */}
        {!loading && sessions.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 12 }}>
            {sessions.map((s, i) => (
              <div key={s.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <SessionCard session={s} onDelete={(id, title) => setDeleteTarget({ id, title })} />
              </div>
            ))}
          </div>
        )}

        {/* list view */}
        {!loading && sessions.length > 0 && viewMode === 'list' && (
          <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onDelete={(id, title) => setDeleteTarget({ id, title })} />
            ))}
          </div>
        )}

      </main>
      </div>

      {/* delete modal */}
      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageFrame>
  );
}
