'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/app/providers';

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
  tags: { name: string }[];
}

const MODES = ['rapido', 'raciocinio', 'pesquisa', 'investigacao', 'sintese'] as const;
type ModeFilter = (typeof MODES)[number] | 'todos';

const MODE_LABELS: Record<string, string> = {
  rapido:      'Rápido',
  raciocinio:  'Raciocínio',
  pesquisa:    'Pesquisa',
  investigacao: 'Investigação',
  sintese:     'Síntese',
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
    `# ${session.title}`,
    '',
    `**Modo:** ${MODE_LABELS[session.mode] ?? session.mode}  `,
    `**Data:** ${new Date(session.createdAt).toLocaleString('pt-PT')}  `,
    `**Vozes:** ${session.voices}`,
    '',
    '---',
    '',
    '## Consulta',
    '',
    session.query,
    '',
  ];

  if (session.responses.length > 0) {
    lines.push('---', '', '## Respostas', '');
    for (const r of session.responses) {
      lines.push(`### ${r.model}`, '', r.content, '');
    }
  }

  if (session.synthesis) {
    lines.push('---', '', '## Síntese', '', session.synthesis, '');
  }

  if (session.notes) {
    lines.push('---', '', '## Notas', '', session.notes, '');
  }

  return lines.join('\n');
}

function exportJSON(session: SessionDetail) {
  return JSON.stringify(session, null, 2);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
        borderRadius: 12,
        padding: '24px 28px',
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
              padding: '7px 16px', borderRadius: 7,
              fontSize: 12, fontWeight: 500,
              background: 'var(--surface-3)',
              color: 'var(--fg-muted)',
              border: '0.5px solid var(--border)',
              cursor: 'pointer',
              transition: 'color 0.12s',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '7px 16px', borderRadius: 7,
              fontSize: 12, fontWeight: 500,
              background: 'var(--err)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── export popover ────────────────────────────────────────────────────────────

function ExportPopover({ session, onClose }: {
  session: SessionDetail | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!session) return null;

  const slug = session.title.slice(0, 40).replace(/\s+/g, '-').toLowerCase();

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: 'calc(100% + 4px)',
      background: 'var(--surface-3)',
      border: '0.5px solid var(--border)',
      borderRadius: 8,
      padding: '4px',
      zIndex: 100,
      animation: 'popIn 0.1s ease',
      minWidth: 140,
    }}>
      {[
        { label: 'Exportar .md', ext: 'md', mime: 'text/markdown', fn: exportMarkdown },
        { label: 'Exportar .json', ext: 'json', mime: 'application/json', fn: exportJSON },
      ].map(({ label, ext, mime, fn }) => (
        <button
          key={ext}
          onClick={() => {
            downloadFile(fn(session), `hydra-${slug}.${ext}`, mime);
            onClose();
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '7px 10px',
            borderRadius: 5, fontSize: 12,
            color: 'var(--cream)',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <IconDownload />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── card ──────────────────────────────────────────────────────────────────────

function SessionCard({
  session, onDelete, onExport,
}: {
  session: SessionItem;
  onDelete: (id: string, title: string) => void;
  onExport: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const router = useRouter();

  return (
    <div
      style={{
        background: hovered ? 'var(--surface-3)' : 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
        animation: 'panelIn 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onClick={() => router.push('/')}
    >
      {/* mode badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 500,
          color: 'var(--fg-muted)',
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 4, padding: '2px 7px',
          letterSpacing: '0.3px',
          textTransform: 'uppercase',
        }}>
          {MODE_LABELS[session.mode] ?? session.mode}
        </span>

        {/* actions — show on hover */}
        <div
          style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* export */}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                padding: '4px 7px', borderRadius: 5,
                color: 'var(--fg-muted)', fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 4,
                background: exportOpen ? 'var(--surface)' : 'transparent',
                border: '0.5px solid ' + (exportOpen ? 'var(--border)' : 'transparent'),
                transition: 'background 0.1s',
              }}
              onClick={() => {
                if (!exportOpen) onExport(session.id);
                setExportOpen((o) => !o);
              }}
              onMouseEnter={(e) => { if (!exportOpen) e.currentTarget.style.background = 'var(--surface)'; }}
              onMouseLeave={(e) => { if (!exportOpen) e.currentTarget.style.background = 'transparent'; }}
              title="Exportar"
            >
              <IconDownload />
            </button>
            {exportOpen && (
              <ExportPopoverConnected
                sessionId={session.id}
                onClose={() => setExportOpen(false)}
              />
            )}
          </div>

          {/* delete */}
          <button
            style={{
              padding: '4px 7px', borderRadius: 5,
              color: 'var(--fg-muted)',
              display: 'flex', alignItems: 'center', gap: 4,
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

      {/* title */}
      <div style={{
        fontSize: 13, fontWeight: 500,
        color: 'var(--cream)',
        marginBottom: 6,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: 1.45,
      }}>
        {session.title}
      </div>

      {/* query preview (only if different from title) */}
      {session.query !== session.title && (
        <div style={{
          fontSize: 11.5, color: 'var(--fg-muted)',
          marginBottom: 8,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.5,
        }}>
          {session.query}
        </div>
      )}

      {/* meta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 10.5, color: 'var(--fg-faint)',
        marginTop: 6,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconClock />
          {formatDate(session.createdAt)}
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{session.voices} vozes</span>
      </div>
    </div>
  );
}

// connected export popover that fetches detail on demand
function ExportPopoverConnected({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {});
  }, [sessionId]);

  if (!detail) {
    return (
      <div style={{
        position: 'absolute', right: 0, top: 'calc(100% + 4px)',
        background: 'var(--surface-3)',
        border: '0.5px solid var(--border)',
        borderRadius: 8, padding: '12px 16px',
        zIndex: 100, fontSize: 11, color: 'var(--fg-muted)',
        minWidth: 140,
      }}>
        A carregar…
      </div>
    );
  }

  return <ExportPopover session={detail} onClose={onClose} />;
}

// ── row (list view) ───────────────────────────────────────────────────────────

function SessionRow({
  session, onDelete, onExport,
}: {
  session: SessionItem;
  onDelete: (id: string, title: string) => void;
  onExport: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        background: hovered ? 'var(--surface-3)' : 'transparent',
        transition: 'background 0.12s',
        gap: 12,
        borderBottom: '0.5px solid var(--border)',
        animation: 'panelIn 0.18s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push('/')}
    >
      <span style={{
        fontSize: 10, fontWeight: 500,
        color: 'var(--fg-muted)',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 4, padding: '2px 7px',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        flexShrink: 0,
        minWidth: 90, textAlign: 'center',
      }}>
        {MODE_LABELS[session.mode] ?? session.mode}
      </span>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500,
          color: 'var(--cream)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {session.title}
        </div>
      </div>

      <div style={{
        fontSize: 10.5, color: 'var(--fg-faint)',
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
      }}>
        <IconClock />
        {formatDate(session.createdAt)}
      </div>

      <div
        style={{ display: 'flex', gap: 2, opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'relative' }}>
          <button
            style={{
              padding: '4px 7px', borderRadius: 5,
              color: 'var(--fg-muted)',
              display: 'flex', alignItems: 'center',
              background: exportOpen ? 'var(--surface)' : 'transparent',
              border: '0.5px solid ' + (exportOpen ? 'var(--border)' : 'transparent'),
            }}
            onClick={() => {
              if (!exportOpen) onExport(session.id);
              setExportOpen((o) => !o);
            }}
            title="Exportar"
          >
            <IconDownload />
          </button>
          {exportOpen && (
            <ExportPopoverConnected sessionId={session.id} onClose={() => setExportOpen(false)} />
          )}
        </div>
        <button
          style={{
            padding: '4px 7px', borderRadius: 5,
            color: 'var(--fg-muted)',
            display: 'flex', alignItems: 'center',
            transition: 'color 0.1s',
          }}
          onClick={() => onDelete(session.id, session.title)}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--err)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
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
  const { sidebarW } = useApp();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // fetch sessions
  const fetchSessions = useCallback(() => {
    const params = new URLSearchParams();
    if (search)                    params.set('q', search);
    if (modeFilter !== 'todos')    params.set('mode', modeFilter);
    const qs = params.toString();
    setLoading(true);
    fetch(`/api/sessions${qs ? '?' + qs : ''}`)
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, modeFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // keyboard shortcut: / focuses search
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

  // delete
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
  const searchActive = search.trim().length > 0 || modeFilter !== 'todos';

  return (
    <main style={{
      marginLeft: sidebarW,
      minHeight: '100vh',
      padding: '32px 32px 64px',
      transition: 'margin-left 0.2s ease',
      maxWidth: 1200 + sidebarW,
    }}>

      {/* ── header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 600,
            color: 'var(--cream)', letterSpacing: '-0.5px',
            marginBottom: 3,
          }}>
            Biblioteca
          </h1>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            {loading ? 'A carregar…' : `${totalCount} ${totalCount === 1 ? 'sessão' : 'sessões'}${searchActive ? ' (filtradas)' : ''}`}
          </p>
        </div>

        {/* view toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 7, padding: 2, gap: 2,
        }}>
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '5px 9px', borderRadius: 5,
                display: 'flex', alignItems: 'center',
                background: viewMode === v ? 'var(--surface-3)' : 'transparent',
                color: viewMode === v ? 'var(--cream)' : 'var(--fg-muted)',
                transition: 'background 0.12s, color 0.12s',
              }}
              title={v === 'grid' ? 'Grelha' : 'Lista'}
            >
              {v === 'grid' ? <IconGrid /> : <IconList />}
            </button>
          ))}
        </div>
      </div>

      {/* ── toolbar ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap',
      }}>

        {/* search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 8,
          padding: '0 12px',
          flex: '1 1 220px', maxWidth: 360,
          height: 36,
        }}>
          <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}><IconSearch /></span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Pesquisar sessões… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 12.5, color: 'var(--cream)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ color: 'var(--fg-faint)', display: 'flex', alignItems: 'center' }}
            >
              <IconX />
            </button>
          )}
        </div>

        {/* mode filter chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['todos', ...MODES] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 11.5, fontWeight: 500,
                background: modeFilter === m ? 'var(--cream)' : 'var(--surface-2)',
                color: modeFilter === m ? 'var(--surface)' : 'var(--fg-muted)',
                border: '0.5px solid ' + (modeFilter === m ? 'transparent' : 'var(--border)'),
                transition: 'background 0.12s, color 0.12s',
                cursor: 'pointer',
              }}
            >
              {m === 'todos' ? 'Todos' : MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* ── empty state ── */}
      {!loading && sessions.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 80,
          gap: 12,
          animation: 'fadeSlideUp 0.3s ease',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconSearch />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)' }}>
            {searchActive ? 'Nenhum resultado' : 'Biblioteca vazia'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
            {searchActive
              ? 'Tenta outros termos ou remove os filtros.'
              : 'Faz uma consulta na Arena para começar a guardar sessões.'}
          </div>
          {searchActive && (
            <button
              onClick={() => { setSearch(''); setModeFilter('todos'); }}
              style={{
                marginTop: 4,
                padding: '7px 16px', borderRadius: 7,
                fontSize: 12, fontWeight: 500,
                background: 'var(--surface-2)',
                color: 'var(--fg-muted)',
                border: '0.5px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ── loading skeleton ── */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
          gap: 12,
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              height: viewMode === 'grid' ? 120 : 52,
              opacity: 0.5,
              animation: `panelIn 0.2s ease ${i * 0.05}s both`,
            }} />
          ))}
        </div>
      )}

      {/* ── grid view ── */}
      {!loading && sessions.length > 0 && viewMode === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {sessions.map((s, i) => (
            <div key={s.id} style={{ animationDelay: `${i * 0.04}s` }}>
              <SessionCard
                session={s}
                onDelete={(id, title) => setDeleteTarget({ id, title })}
                onExport={() => {}}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── list view ── */}
      {!loading && sessions.length > 0 && viewMode === 'list' && (
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onDelete={(id, title) => setDeleteTarget({ id, title })}
              onExport={() => {}}
            />
          ))}
        </div>
      )}

      {/* ── delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
