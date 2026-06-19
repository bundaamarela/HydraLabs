'use client';

import { useEffect, useState, type CSSProperties, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getModelById, MODEL_ACCENTS, type CrossAction, type ModelConfig, type ModelId } from '@/lib/models';
import { Panel, type PanelStatus, type CrossExamTurn } from './Panel';

export type { CrossExamTurn };

export interface ModelState {
  status: PanelStatus;
  content: string;
  reasoning?: string;
  sources?: { url: string; title?: string }[];
  /** Modelo não suporta a modalidade do anexo: respondeu só ao texto. */
  unsupported?: boolean;
  /** Turnos de cruzamento recebidos por este modelo (críticas a outros). */
  crossExams?: CrossExamTurn[];
  error?: string;
}

interface PanelGridProps {
  states: Partial<Record<ModelId, ModelState>>;
  /** Modelos a renderizar nesta ronda, por ordem (selecção por consulta). */
  models: ModelId[];
  density: 2 | 3 | 6;
  grounding?: boolean;
  onCrossExam?: (sourceModel: ModelId, sourceAnswer: string, targetModel: ModelId, action: CrossAction) => void;
  onRegenerate?: (modelId: ModelId) => void;
}

// ── persisted layout (ordem + fixados + colapsados) ──────────────────────────
interface Layout { order: ModelId[]; pinned: ModelId[]; collapsed: ModelId[]; }
const LAYOUT_KEY = 'hydra_panel_layout';
const EMPTY_LAYOUT: Layout = { order: [], pinned: [], collapsed: [] };

function readLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return EMPTY_LAYOUT;
    const p = JSON.parse(raw) as Partial<Layout>;
    return {
      order:     Array.isArray(p.order)     ? p.order     : [],
      pinned:    Array.isArray(p.pinned)    ? p.pinned    : [],
      collapsed: Array.isArray(p.collapsed) ? p.collapsed : [],
    };
  } catch {
    return EMPTY_LAYOUT;
  }
}
function writeLayout(l: Layout) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* ignore */ }
}
function toggleId(arr: ModelId[], id: ModelId): ModelId[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

/** Ordem efectiva: ordem custom (drag) → restantes; fixados sempre primeiro. */
function orderIds(models: ModelId[], layout: Layout): ModelId[] {
  const present = new Set(models);
  const inOrder = layout.order.filter((id) => present.has(id));
  const rest = models.filter((id) => !layout.order.includes(id));
  const base = [...inOrder, ...rest];
  const pinned = base.filter((id) => layout.pinned.includes(id));
  const unpinned = base.filter((id) => !layout.pinned.includes(id));
  return [...pinned, ...unpinned];
}

const STAGGER = 0.04;
const DEFAULT_STATE: ModelState = { status: 'idle', content: '' };

// ── ícones de controlo ───────────────────────────────────────────────────────
function IconGrip() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor">
      {[3, 7, 11].map((y) => [5, 9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.2h4M7 2.2v5M4.4 7.2h5.2l-1.1 3h-3l-1.1-3ZM7 10.2v2.2" />
    </svg>
  );
}
function IconCollapse() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,8 7,5 10,8" />
      <line x1="4" y1="10.6" x2="10" y2="10.6" />
    </svg>
  );
}
function IconExpand() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,6 7,9 10,6" />
      <line x1="4" y1="3.4" x2="10" y2="3.4" />
    </svg>
  );
}
function IconFocus() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,5 2,2 5,2" />
      <polyline points="9,2 12,2 12,5" />
      <polyline points="12,9 12,12 9,12" />
      <polyline points="5,12 2,12 2,9" />
    </svg>
  );
}

const ctrlBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 20, height: 20, borderRadius: 4,
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--fg-muted)', transition: 'color 0.1s, background 0.1s',
};

// ── stub colapsado (apenas cabeçalho) ────────────────────────────────────────
function CollapsedStub({ model, status }: { model: ModelConfig; status: PanelStatus }) {
  const accent = MODEL_ACCENTS[model.id];
  const dot = status === 'done' ? 'var(--ok)' : status === 'error' ? 'var(--err)' : status === 'idle' ? 'var(--fg-faint)' : 'var(--fg-muted)';
  return (
    <div style={{
      background: 'var(--surface-2)', border: '0.5px solid var(--border)',
      borderLeft: `2.5px solid ${accent}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', minHeight: 40,
    }}>
      <span style={{
        flexShrink: 0, height: 16, padding: '0 4px', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8.5, fontWeight: 700, letterSpacing: '0.3px',
        background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent,
        border: `0.5px solid color-mix(in srgb, ${accent} 45%, transparent)`,
      }}>
        {model.name.slice(0, 2).toUpperCase()}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cream)' }}>{model.name}</span>
      <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: dot }} />
    </div>
  );
}

// ── célula (controlo + drag + colapso/foco) ──────────────────────────────────
interface CellProps {
  model: ModelConfig;
  state: ModelState;
  index: number;
  grounding?: boolean;
  crossTargetIds: ModelId[];
  pinned: boolean;
  collapsed: boolean;
  focused: boolean;
  dragging: boolean;
  onCrossExam?: (sourceModel: ModelId, sourceAnswer: string, targetModel: ModelId, action: CrossAction) => void;
  onRegenerate?: (modelId: ModelId) => void;
  onPin: () => void;
  onCollapse: () => void;
  onFocus: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: () => void;
}

function PanelCell(p: CellProps) {
  const [hover, setHover] = useState(false);
  const showCtrls = hover || p.pinned || p.collapsed || p.focused;
  const collapsedView = p.collapsed && !p.focused;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: p.index * STAGGER, ease: 'easeOut' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={p.onDragOver}
      onDrop={p.onDrop}
      style={{ position: 'relative', opacity: p.dragging ? 0.4 : 1 }}
    >
      {/* controlos: arrastar · fixar · colapsar · foco */}
      <div style={{
        position: 'absolute', top: 6, right: 8, zIndex: 6,
        display: 'flex', gap: 1, padding: 2,
        background: 'var(--surface-3)', border: '0.5px solid var(--border)', borderRadius: 6,
        opacity: showCtrls ? 1 : 0, pointerEvents: showCtrls ? 'auto' : 'none',
        transition: 'opacity 0.12s',
      }}>
        <button
          draggable onDragStart={p.onDragStart} onDragEnd={p.onDragEnd}
          title="Arrastar para reordenar" style={{ ...ctrlBtn, cursor: 'grab' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
        >
          <IconGrip />
        </button>
        <button
          onClick={p.onPin} title={p.pinned ? 'Desafixar' : 'Fixar no início'}
          style={{ ...ctrlBtn, color: p.pinned ? 'var(--cream)' : 'var(--fg-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = p.pinned ? 'var(--cream)' : 'var(--fg-muted)')}
        >
          <IconPin />
        </button>
        <button
          onClick={p.onCollapse} title={p.collapsed ? 'Expandir' : 'Colapsar'}
          style={ctrlBtn}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
        >
          {p.collapsed ? <IconExpand /> : <IconCollapse />}
        </button>
        <button
          onClick={p.onFocus} title={p.focused ? 'Sair do foco (Esc)' : 'Foco (ecrã inteiro)'}
          style={{ ...ctrlBtn, color: p.focused ? 'var(--cream)' : 'var(--fg-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = p.focused ? 'var(--cream)' : 'var(--fg-muted)')}
        >
          <IconFocus />
        </button>
      </div>

      {collapsedView ? (
        <CollapsedStub model={p.model} status={p.state.status} />
      ) : (
        <Panel
          model={p.model}
          status={p.state.status}
          content={p.state.content}
          reasoning={p.state.reasoning}
          sources={p.state.sources}
          unsupported={p.state.unsupported}
          crossExams={p.state.crossExams}
          crossTargetIds={p.crossTargetIds}
          grounding={p.grounding}
          error={p.state.error}
          focused={p.focused}
          onCrossExam={
            p.onCrossExam
              ? (target, action) => p.onCrossExam!(p.model.id, p.state.content, target, action)
              : undefined
          }
          onRegenerate={p.onRegenerate ? () => p.onRegenerate!(p.model.id) : undefined}
        />
      )}
    </motion.div>
  );
}

export function PanelGrid({ states, models, density, grounding, onCrossExam, onRegenerate }: PanelGridProps) {
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [focused, setFocused] = useState<ModelId | null>(null);
  const [dragging, setDragging] = useState<ModelId | null>(null);

  useEffect(() => { setLayout(readLayout()); }, []);

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocused(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  const update = (patch: Partial<Layout>) =>
    setLayout((l) => { const next = { ...l, ...patch }; writeLayout(next); return next; });

  const ordered = orderIds(models, layout);
  const configs = ordered.map((id) => getModelById(id)).filter((m): m is ModelConfig => !!m);
  const visible = focused ? configs.filter((m) => m.id === focused) : configs;
  const cols = focused ? 1 : Math.min(density, Math.max(visible.length, 1));

  const handleDrop = (targetId: ModelId) => {
    const src = dragging;
    setDragging(null);
    if (!src || src === targetId) return;
    const base = orderIds(models, layout);
    const from = base.indexOf(src);
    const to = base.indexOf(targetId);
    if (from < 0 || to < 0) return;
    base.splice(from, 1);
    base.splice(to, 0, src);
    update({ order: base });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10,
      padding: '12px 16px',
    }}>
      <AnimatePresence>
        {visible.map((model, index) => (
          <PanelCell
            key={model.id}
            model={model}
            state={states[model.id] ?? DEFAULT_STATE}
            index={index}
            grounding={grounding}
            crossTargetIds={models}
            pinned={layout.pinned.includes(model.id)}
            collapsed={layout.collapsed.includes(model.id)}
            focused={focused === model.id}
            dragging={dragging === model.id}
            onCrossExam={onCrossExam}
            onRegenerate={onRegenerate}
            onPin={() => update({ pinned: toggleId(layout.pinned, model.id) })}
            onCollapse={() => update({ collapsed: toggleId(layout.collapsed, model.id) })}
            onFocus={() => setFocused((f) => (f === model.id ? null : model.id))}
            onDragStart={(e) => { setDragging(model.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', model.id); }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => { if (dragging) e.preventDefault(); }}
            onDrop={() => handleDrop(model.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
