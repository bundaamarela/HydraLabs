'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageFrame } from '@/components/layout/PageFrame';

// ── types ─────────────────────────────────────────────────────────────────────

interface WorkspaceItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { blocks: number };
  project: { id: string; name: string; color: string } | null;
}

// ── icons ─────────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
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

function IconBlocks() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4" height="4" rx=".6" />
      <rect x="8" y="2" width="4" height="4" rx=".6" />
      <rect x="2" y="8" width="4" height="4" rx=".6" />
      <rect x="8" y="8" width="4" height="4" rx=".6" />
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" />
      <line x1="1.5" y1="5" x2="12.5" y2="5" />
      <line x1="5"   y1="5" x2="5"    y2="12.5" />
    </svg>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

// ── new workspace modal ────────────────────────────────────────────────────────

function NewWorkspaceModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (ws: WorkspaceItem) => void;
}) {
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const ws = await res.json();
      onCreate(ws);
    } finally {
      setCreating(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); }
    if (e.key === 'Escape') onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 12, padding: '24px 28px',
          maxWidth: 420, width: '90%',
          animation: 'popIn 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)', marginBottom: 16 }}>
          Novo workspace
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            autoFocus
            type="text"
            placeholder="Título do workspace"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 7, fontSize: 13, color: 'var(--cream)', outline: 'none',
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', resize: 'none',
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 7, fontSize: 12, color: 'var(--cream)', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'var(--surface-3)', color: 'var(--fg-muted)', border: '0.5px solid var(--border)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || creating}
            style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: title.trim() ? 'var(--cream)' : 'var(--surface-3)', color: title.trim() ? 'var(--surface)' : 'var(--fg-faint)', border: 'none', cursor: title.trim() ? 'pointer' : 'default' }}
          >
            {creating ? 'A criar…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── workspace card ────────────────────────────────────────────────────────────

function WorkspaceCard({ ws }: { ws: WorkspaceItem }) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/workspace/${ws.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-2)',
        border: '0.5px solid ' + (hovered ? 'var(--fg-faint)' : 'var(--border)'),
        borderRadius: 10, padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 2px 14px rgba(0,0,0,0.2)' : 'none',
        animation: 'panelIn 0.2s ease',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)', lineHeight: 1.4 }}>
          {ws.title}
        </div>
        {ws.project && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: ws.project.color, flexShrink: 0, marginTop: 4,
          }} title={ws.project.name} />
        )}
      </div>

      {ws.description && (
        <div style={{
          fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.55,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {ws.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, color: 'var(--fg-faint)', marginTop: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconBlocks /> {ws._count.blocks} {ws._count.blocks === 1 ? 'bloco' : 'blocos'}
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <IconClock /> {formatDate(ws.updatedAt)}
        </span>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((data) => { setWorkspaces(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageFrame
      title={
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)', letterSpacing: '-0.3px', margin: 0 }}>
            Workspaces
          </h1>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {loading ? 'A carregar…' : `${workspaces.length} ${workspaces.length === 1 ? 'workspace' : 'workspaces'}`}
          </span>
        </div>
      }
      actions={
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: 'var(--cream)', color: 'var(--surface)',
            fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
          }}
        >
          <IconPlus /> Novo workspace
        </button>
      }
    >
    <div style={{ padding: '24px 32px 64px', maxWidth: 1100 }}>

      {/* empty state */}
      {!loading && workspaces.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 12, animation: 'fadeSlideUp 0.3s ease' }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: 'var(--surface-2)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconWorkspace />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)' }}>Sem workspaces</div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
            Cria um workspace para consolidar a tua investigação.
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ marginTop: 4, padding: '8px 18px', borderRadius: 8, background: 'var(--cream)', color: 'var(--surface)', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IconPlus /> Criar workspace
          </button>
        </div>
      )}

      {/* loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 10, height: 110, opacity: 0.5, animation: `panelIn 0.2s ease ${i * 0.06}s both` }} />
          ))}
        </div>
      )}

      {/* grid */}
      {!loading && workspaces.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
          {workspaces.map((ws) => <WorkspaceCard key={ws.id} ws={ws} />)}
        </div>
      )}

      {showModal && (
        <NewWorkspaceModal
          onClose={() => setShowModal(false)}
          onCreate={(ws) => {
            setWorkspaces((prev) => [{ ...ws, _count: { blocks: 0 } }, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
    </PageFrame>
  );
}
