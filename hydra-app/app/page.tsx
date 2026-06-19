'use client';

import { useState, useCallback, useRef } from 'react';
import { useApp } from './providers';
import { ACTIVE_MODELS, MODELS, type ModelId, type ModeId } from '@/lib/models';
import { Topbar } from '@/components/arena/Topbar';
import { QueryBubble } from '@/components/arena/QueryBubble';
import { PanelGrid, type ModelState } from '@/components/arena/PanelGrid';
import { ModeSelector } from '@/components/arena/ModeSelector';
import { InputBar } from '@/components/arena/InputBar';
import { SynthesisPanel } from '@/components/arena/SynthesisPanel';
import type { PanelStatus } from '@/components/arena/Panel';
import type { ApiKeys } from '@/lib/models';
import type { Attachment } from '@/lib/orchestrator';
import { DEFAULT_ROLES } from '@/lib/roles';

type ArenaPhase = 'idle' | 'running' | 'synthesis' | 'done';

const INITIAL_STATES = (): Partial<Record<ModelId, ModelState>> =>
  Object.fromEntries(MODELS.map((m) => [m.id, { status: 'idle' as PanelStatus, content: '' }]));

// Chaves API guardadas localmente, enviadas em cada pedido ao servidor.
function readApiKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem('hydra_api_keys');
    return raw ? (JSON.parse(raw) as ApiKeys) : {};
  } catch {
    return {};
  }
}

// Papéis por modelo (persona): defaults + overrides guardados pelo utilizador.
function readRoles(): Record<string, string> {
  try {
    const raw = localStorage.getItem('hydra_model_roles');
    const stored = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return { ...DEFAULT_ROLES, ...stored } as Record<string, string>;
  } catch {
    return { ...DEFAULT_ROLES } as Record<string, string>;
  }
}

// Toggle "Usar papéis" guardado em hydra_prefs (default: true).
function readUseRoles(): boolean {
  try {
    const raw = localStorage.getItem('hydra_prefs');
    if (!raw) return true;
    const p = JSON.parse(raw) as { useRoles?: boolean };
    return p.useRoles !== false;
  } catch {
    return true;
  }
}

export default function ArenaPage() {
  const { sidebarW, notesW, setActiveSessionId } = useApp();

  const [query, setQuery]         = useState('');
  const [mode, setMode]           = useState<ModeId>('raciocinio');
  const [density, setDensity]     = useState<2 | 3 | 6>(3);
  const [grounding, setGrounding] = useState(false);
  const [submittedAttachment, setSubmittedAttachment] = useState<Attachment | null>(null);
  const [modeSelectorOpen, setModeSelectorOpen] = useState(false);
  const [panelStates, setPanelStates] = useState<Partial<Record<ModelId, ModelState>>>(INITIAL_STATES());
  const [phase, setPhase]         = useState<ArenaPhase>('idle');
  const [synthesisStatus, setSynthesisStatus] = useState<PanelStatus>('idle');
  const [synthesisContent, setSynthesisContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const updatePanel = useCallback((modelId: ModelId, patch: Partial<ModelState>) => {
    setPanelStates((prev) => ({
      ...prev,
      [modelId]: { ...(prev[modelId] ?? { status: 'idle', content: '' }), ...patch },
    }));
  }, []);

  const processingCount = Object.values(panelStates).filter(
    (s) => s?.status === 'processing' || s?.status === 'streaming',
  ).length;

  const doneCount = Object.values(panelStates).filter(
    (s) => s?.status === 'done',
  ).length;

  // ── SSE reader ───────────────────────────────────────────────────────────

  async function readSSE(
    body: ReadableStream<Uint8Array>,
    onToken: (modelId: ModelId, token: string, kind?: 'text' | 'reasoning') => void,
    onDone: (modelId: ModelId) => void,
    onError: (modelId: ModelId, err: string) => void,
    onAllDone: () => void,
    onSources?: (modelId: ModelId, sources: { url: string; title?: string }[]) => void,
    onUnsupported?: (modelId: ModelId) => void,
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.done && !evt.model) {
            onAllDone();
            return;
          }
          if (evt.model) {
            if (evt.kind === 'sources' && evt.sources) onSources?.(evt.model as ModelId, evt.sources);
            else if (evt.unsupported)                  onUnsupported?.(evt.model as ModelId);
            else if (evt.token !== undefined)          onToken(evt.model as ModelId, evt.token, evt.kind);
            else if (evt.done)                         onDone(evt.model as ModelId);
            else if (evt.error)                        onError(evt.model as ModelId, evt.error);
          }
        } catch { /* skip malformed */ }
      }
    }
    onAllDone();
  }

  // ── synthesis ────────────────────────────────────────────────────────────

  async function runSynthesis(
    submittedQuery: string,
    finalStates: Partial<Record<ModelId, ModelState>>,
  ) {
    setPhase('synthesis');
    setSynthesisStatus('processing');

    const responses = ACTIVE_MODELS
      .map((m) => {
        const s = finalStates[m.id];
        return s?.status === 'done' ? `[${m.name}]\n${s.content}` : null;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!responses) {
      setSynthesisStatus('error');
      setPhase('done');
      return;
    }

    const synthesisQuery =
      `Pergunta original: "${submittedQuery}"\n\n` +
      `Respostas das IAs:\n\n${responses}\n\n` +
      `Sintetiza as respostas acima em três secções obrigatórias:\n` +
      `## CONSENSO\n## DIVERGÊNCIA\n## INSIGHT`;

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: synthesisQuery, mode: 'sintese', models: ['claude'], keys: readApiKeys(), useRoles: false }),
        signal: abortRef.current?.signal,
      });

      if (!resp.ok || !resp.body) throw new Error('synthesis request failed');

      setSynthesisStatus('streaming');

      await readSSE(
        resp.body,
        (_mid, token, kind) => { if (kind !== 'reasoning') setSynthesisContent((c) => c + token); },
        () => {},
        () => setSynthesisStatus('error'),
        () => {
          setSynthesisStatus('done');
          setPhase('done');
        },
      );
    } catch {
      setSynthesisStatus('error');
      setPhase('done');
    }
  }

  // ── submit ───────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (submittedQuery: string, attachment?: Attachment) => {
    if (phase === 'running' || phase === 'synthesis') return;

    // Reset state
    const fresh = INITIAL_STATES();
    setPanelStates(fresh);
    setSynthesisStatus('idle');
    setSynthesisContent('');
    setQuery(submittedQuery);
    setSubmittedAttachment(attachment ?? null);
    setPhase('running');

    // Mark all active models as processing
    const activeIds = ACTIVE_MODELS.map((m) => m.id);
    setPanelStates((prev) => {
      const next = { ...prev };
      for (const id of activeIds) next[id] = { status: 'processing', content: '' };
      return next;
    });

    abortRef.current = new AbortController();

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: submittedQuery, mode, models: activeIds, keys: readApiKeys(), roles: readRoles(), useRoles: readUseRoles(), grounding, attachment }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error('chat request failed');

      // Track final states for synthesis
      const finalStates: Partial<Record<ModelId, ModelState>> = {};
      const completed = new Set<ModelId>();

      await readSSE(
        resp.body,
        (modelId, token, kind) => {
          const prev = finalStates[modelId] ?? { status: 'streaming' as PanelStatus, content: '' };
          if (kind === 'reasoning') {
            const reasoning = (prev.reasoning ?? '') + token;
            finalStates[modelId] = { ...prev, status: 'streaming', reasoning };
            updatePanel(modelId, { status: 'streaming', reasoning });
          } else {
            const content = (prev.content ?? '') + token;
            finalStates[modelId] = { ...prev, status: 'streaming', content };
            updatePanel(modelId, { status: 'streaming', content });
          }
        },
        (modelId) => {
          const prev = finalStates[modelId];
          const content = prev?.content ?? '';
          updatePanel(modelId, { status: 'done', content });
          finalStates[modelId] = { status: 'done', content, reasoning: prev?.reasoning };
          completed.add(modelId);
        },
        (modelId, err) => {
          const prev = finalStates[modelId];
          updatePanel(modelId, { status: 'error', error: err });
          finalStates[modelId] = { status: 'error', content: prev?.content ?? '', reasoning: prev?.reasoning, error: err };
          completed.add(modelId);
        },
        async () => {
          // Mark any remaining streaming as done
          setPanelStates((prev) => {
            const next = { ...prev };
            for (const id of activeIds) {
              if (next[id]?.status === 'streaming' || next[id]?.status === 'processing') {
                const cur = next[id];
                const content = cur?.content ?? '';
                next[id] = { status: 'done', content, reasoning: cur?.reasoning };
                finalStates[id] = { status: 'done', content, reasoning: cur?.reasoning };
              }
            }
            return next;
          });

          // Persist session
          try {
            const responses = activeIds
              .filter((id) => finalStates[id]?.status === 'done')
              .map((id) => ({ model: id, content: finalStates[id]!.content, reasoning: finalStates[id]!.reasoning }));

            const sess = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: submittedQuery, mode, voices: responses.length, responses }),
            });
            const sessData = await sess.json();
            if (sessData?.id) setActiveSessionId(sessData.id);
          } catch { /* non-fatal */ }

          // Start synthesis
          await runSynthesis(submittedQuery, finalStates);
        },
        (modelId, srcs) => {
          const prev = finalStates[modelId] ?? { status: 'streaming' as PanelStatus, content: '' };
          finalStates[modelId] = { ...prev, sources: srcs };
          updatePanel(modelId, { sources: srcs });
        },
        (modelId) => {
          const prev = finalStates[modelId] ?? { status: 'processing' as PanelStatus, content: '' };
          finalStates[modelId] = { ...prev, unsupported: true };
          updatePanel(modelId, { unsupported: true });
        },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setPhase('done');
      // Mark all still-processing panels as error
      setPanelStates((prev) => {
        const next = { ...prev };
        for (const id of activeIds) {
          if (next[id]?.status === 'processing' || next[id]?.status === 'streaming') {
            next[id] = { status: 'error', content: next[id]?.content ?? '', error: 'Pedido interrompido.' };
          }
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, updatePanel, setActiveSessionId]);

  // Selecção de modo. Consolidação combina com pesquisa web — sugere (não força)
  // grounding ON; o utilizador pode desligar a seguir.
  const handleModeSelect = useCallback((m: ModeId) => {
    setMode(m);
    if (m === 'consolidacao') setGrounding(true);
  }, []);

  const isRunning = phase === 'running' || phase === 'synthesis';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar
        mode={mode}
        onModeClick={() => setModeSelectorOpen((o) => !o)}
        processingCount={processingCount}
        doneCount={doneCount}
        density={density}
        onDensity={setDensity}
      />

      <ModeSelector
        open={modeSelectorOpen}
        onClose={() => setModeSelectorOpen(false)}
        mode={mode}
        onSelect={handleModeSelect}
      />

      {/* scroll area — padded for InputBar */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
        <QueryBubble query={query} attachment={submittedAttachment} />

        {query && (
          <PanelGrid states={panelStates} density={density} grounding={grounding} />
        )}

        {(synthesisStatus !== 'idle') && (
          <SynthesisPanel status={synthesisStatus} content={synthesisContent} />
        )}

        {!query && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 120px)',
            flexDirection: 'column', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'var(--cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              letterSpacing: '-0.3px',
            }}>
              HL
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', letterSpacing: '-0.1px' }}>
              Consulta {ACTIVE_MODELS.length} inteligências em simultâneo.
            </p>
          </div>
        )}
      </div>

      <InputBar
        mode={mode}
        onModeSelect={handleModeSelect}
        onSubmit={handleSubmit}
        disabled={isRunning}
        grounding={grounding}
        onGrounding={setGrounding}
      />
    </div>
  );
}
