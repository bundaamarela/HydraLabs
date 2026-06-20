'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from './providers';
import { readTheme, densityToGrid } from '@/lib/theme';
import { ACTIVE_MODELS, MODELS, MODE_LABELS, type CrossAction, type ModelId, type ModeId } from '@/lib/models';
import { PageFrame } from '@/components/layout/PageFrame';
import { QueryBubble } from '@/components/arena/QueryBubble';
import { PanelGrid, type ModelState, type CrossExamTurn } from '@/components/arena/PanelGrid';
import { ModeSelector } from '@/components/arena/ModeSelector';
import { InputBar, type InputBarHandle } from '@/components/arena/InputBar';
import { ArenaEmpty } from '@/components/arena/ArenaEmpty';
import { PastTurn, type ConvTurn } from '@/components/arena/PastTurns';
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
  const { activeSessionId, setActiveSessionId, pendingSessionId, clearPendingSession, openSession, isMobile } = useApp();

  const [query, setQuery]         = useState('');
  const [mode, setMode]           = useState<ModeId>('raciocinio');
  const [density, setDensity]     = useState<2 | 3 | 6>(3);
  const [grounding, setGrounding] = useState(false);
  const [submittedAttachment, setSubmittedAttachment] = useState<Attachment | null>(null);
  const [selectedModels, setSelectedModels] = useState<ModelId[]>(ACTIVE_MODELS.map((m) => m.id));
  const [roundModels, setRoundModels] = useState<ModelId[]>(ACTIVE_MODELS.map((m) => m.id));
  const [modeSelectorOpen, setModeSelectorOpen] = useState(false);
  const [panelStates, setPanelStates] = useState<Partial<Record<ModelId, ModelState>>>(INITIAL_STATES());
  const [phase, setPhase]         = useState<ArenaPhase>('idle');
  const [synthesisStatus, setSynthesisStatus] = useState<PanelStatus>('idle');
  const [synthesisContent, setSynthesisContent] = useState('');
  const [pastTurns, setPastTurns] = useState<ConvTurn[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputBarRef = useRef<InputBarHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Densidade inicial da grelha vem do preset de aparência (hydra_theme).
  useEffect(() => { setDensity(densityToGrid(readTheme().density)); }, []);

  // Estado vazio → preenche o input com uma sugestão/template.
  const handlePickPrompt = useCallback((text: string) => {
    inputBarRef.current?.insert(text);
  }, []);

  // Estado vazio / sidebar / biblioteca → pede a reabertura de uma sessão guardada.
  const handleReopen = useCallback((sessionId: string) => {
    openSession(sessionId);
  }, [openSession]);

  // Consome o pedido de reabertura: hidrata a Arena com a sessão guardada
  // (pergunta + respostas por painel + cruzamentos + síntese), em estado 'done'.
  useEffect(() => {
    if (!pendingSessionId) return;
    const id = pendingSessionId;
    clearPendingSession();
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessions/${id}`);
        if (!r.ok) return;
        const d = (await r.json()) as {
          query: string; mode: string; synthesis?: string | null;
          turns?: unknown;
          responses?: { model: string; content: string; reasoning?: string | null }[];
          crossExams?: { sourceModel: string; targetModel: string; action: string; content: string; reasoning?: string | null }[];
        };
        if (cancelled) return;

        const turnsArr: ConvTurn[] | null =
          Array.isArray(d.turns) && d.turns.length ? (d.turns as ConvTurn[]) : null;

        const states: Partial<Record<ModelId, ModelState>> = INITIAL_STATES();
        let ids: ModelId[] = [];
        let q = '';

        if (turnsArr) {
          // conversa multi-turno: turnos anteriores → histórico; último → ronda actual
          const last = turnsArr[turnsArr.length - 1];
          setPastTurns(turnsArr.slice(0, -1));
          ids = Object.keys(last.answers) as ModelId[];
          for (const [mid, content] of Object.entries(last.answers)) {
            states[mid as ModelId] = { status: 'done', content: content as string };
          }
          q = last.query;
        } else {
          // sessão antiga (sem thread guardado): uma ronda a partir de responses
          setPastTurns([]);
          const responses = d.responses ?? [];
          ids = responses.map((x) => x.model as ModelId);
          for (const resp of responses) {
            states[resp.model as ModelId] = { status: 'done', content: resp.content, reasoning: resp.reasoning ?? undefined };
          }
          q = d.query;
        }

        // cruzamentos guardados → painéis da ronda actual
        for (const cx of d.crossExams ?? []) {
          const tgt = cx.targetModel as ModelId;
          const panel = states[tgt] ?? { status: 'done' as PanelStatus, content: '' };
          const turn: CrossExamTurn = {
            id: `cx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            sourceModel: cx.sourceModel as ModelId,
            action: cx.action as CrossAction,
            status: 'done', content: cx.content, reasoning: cx.reasoning ?? undefined,
          };
          panel.crossExams = [...(panel.crossExams ?? []), turn];
          states[tgt] = panel;
        }

        abortRef.current?.abort(); // pára qualquer stream em curso

        setPanelStates(states);
        setRoundModels(ids.length ? ids : ACTIVE_MODELS.map((m) => m.id));
        setQuery(q);
        setSubmittedAttachment(null);
        const m = d.mode as ModeId;
        if (MODE_LABELS[m]) setMode(m);
        if (d.synthesis) { setSynthesisContent(d.synthesis); setSynthesisStatus('done'); }
        else { setSynthesisContent(''); setSynthesisStatus('idle'); }
        setPhase('done');
        setActiveSessionId(id);
      } catch { /* erros sobem ao error boundary */ }
    })();
    return () => { cancelled = true; };
  }, [pendingSessionId, clearPendingSession, setActiveSessionId]);

  // Recomeça do zero: limpa o histórico da conversa e a ronda atual.
  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setPastTurns([]);
    setPanelStates(INITIAL_STATES());
    setQuery('');
    setSubmittedAttachment(null);
    setSynthesisContent('');
    setSynthesisStatus('idle');
    setPhase('idle');
    setActiveSessionId(null);
  }, [setActiveSessionId]);

  // Multi-turno: ao iniciar uma ronda, rola para o fundo (mostra a nova pergunta).
  useEffect(() => {
    if (phase === 'running' && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [phase]);

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
    sessionId?: string | null,
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

      let full = '';
      await readSSE(
        resp.body,
        (_mid, token, kind) => { if (kind !== 'reasoning') { full += token; setSynthesisContent((c) => c + token); } },
        () => {},
        () => setSynthesisStatus('error'),
        () => {
          setSynthesisStatus('done');
          setPhase('done');
          // persiste a síntese na sessão da conversa
          if (sessionId && full.trim()) {
            fetch(`/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ synthesis: full }),
            }).catch(() => {});
          }
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

    // Multi-turno: arquiva a ronda concluída atual como turno anterior e monta o
    // histórico a enviar (vazio na 1.ª pergunta → idêntico a turno único).
    const archivedAnswers: Partial<Record<ModelId, string>> = {};
    if (query && phase === 'done') {
      for (const id of roundModels) {
        const st = panelStates[id];
        if (st?.status === 'done' && st.content) archivedAnswers[id] = st.content;
      }
    }
    const history: ConvTurn[] = Object.keys(archivedAnswers).length
      ? [...pastTurns, { query, answers: archivedAnswers }]
      : pastTurns;
    setPastTurns(history);

    // Reset state
    const fresh = INITIAL_STATES();
    setPanelStates(fresh);
    setSynthesisStatus('idle');
    setSynthesisContent('');
    setQuery(submittedQuery);
    setSubmittedAttachment(attachment ?? null);
    setPhase('running');

    // Modelos desta ronda = selecção do utilizador (mínimo 1; fallback todos).
    const activeIds = selectedModels.length ? selectedModels : ACTIVE_MODELS.map((m) => m.id);
    setRoundModels(activeIds);
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
        body: JSON.stringify({ query: submittedQuery, mode, models: activeIds, keys: readApiKeys(), roles: readRoles(), useRoles: readUseRoles(), grounding, attachment, history }),
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

          // Persiste a conversa: 1.ª ronda → cria a sessão; rondas seguintes →
          // actualizam a MESMA sessão (uma conversa = uma sessão) com o thread
          // completo (turns). Assim reabrir restaura a conversa toda + contexto.
          let sessionId = activeSessionId;
          try {
            const responses = activeIds
              .filter((id) => finalStates[id]?.status === 'done')
              .map((id) => ({ model: id, content: finalStates[id]!.content, reasoning: finalStates[id]!.reasoning }));

            const currentAnswers: Record<string, string> = {};
            for (const id of activeIds) {
              const st = finalStates[id];
              if (st?.status === 'done' && st.content) currentAnswers[id] = st.content;
            }
            const allTurns = [...history, { query: submittedQuery, answers: currentAnswers }];
            const turnsJson = JSON.stringify(allTurns);

            if (sessionId) {
              await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turns: turnsJson, voices: responses.length }),
              });
            } else {
              const sess = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: allTurns[0].query, mode, voices: responses.length, responses, turns: turnsJson }),
              });
              const sessData = await sess.json();
              if (sessData?.id) { sessionId = sessData.id; setActiveSessionId(sessData.id); }
            }
          } catch { /* non-fatal */ }

          // Síntese (e persiste-a na sessão da conversa).
          await runSynthesis(submittedQuery, finalStates, sessionId);
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
  }, [phase, mode, grounding, selectedModels, updatePanel, setActiveSessionId, query, pastTurns, roundModels, panelStates, activeSessionId]);

  // Selecção de modo. Consolidação combina com pesquisa web — sugere (não força)
  // grounding ON; o utilizador pode desligar a seguir.
  const handleModeSelect = useCallback((m: ModeId) => {
    setMode(m);
    if (m === 'consolidacao') setGrounding(true);
  }, []);

  // Selecção por consulta: liga/desliga um modelo, mantendo a ordem e ≥ 1 activo.
  const handleToggleModel = useCallback((id: ModelId) => {
    setSelectedModels((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length === 0 ? prev : next;
      }
      return ACTIVE_MODELS.map((m) => m.id).filter((mid) => mid === id || prev.includes(mid));
    });
  }, []);

  // ── cross-examination ──────────────────────────────────────────────────────
  // Envia a resposta de um painel concluído a outro modelo para crítica/refutação/
  // melhoria; o resultado renderiza dentro do painel do modelo-alvo, em streaming.
  const handleCrossExam = useCallback(async (
    sourceModel: ModelId,
    sourceAnswer: string,
    targetModel: ModelId,
    action: CrossAction,
  ) => {
    if (!sourceAnswer?.trim()) return;
    const id = `cx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    setPanelStates((prev) => {
      const panel = prev[targetModel] ?? { status: 'idle' as PanelStatus, content: '' };
      const turn: CrossExamTurn = { id, sourceModel, action, status: 'processing', content: '' };
      return { ...prev, [targetModel]: { ...panel, crossExams: [...(panel.crossExams ?? []), turn] } };
    });

    const patchTurn = (patch: Partial<CrossExamTurn>) => {
      setPanelStates((prev) => {
        const panel = prev[targetModel];
        if (!panel) return prev;
        const crossExams = (panel.crossExams ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t));
        return { ...prev, [targetModel]: { ...panel, crossExams } };
      });
    };

    let finalContent = '';
    let finalReasoning = '';
    try {
      const resp = await fetch('/api/crossexam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceModel, sourceAnswer, targetModel, action, originalQuery: query, keys: readApiKeys() }),
      });
      if (!resp.ok || !resp.body) throw new Error('crossexam request failed');

      await readSSE(
        resp.body,
        (_mid, token, kind) => {
          if (kind === 'reasoning') { finalReasoning += token; patchTurn({ status: 'streaming', reasoning: finalReasoning }); }
          else                      { finalContent  += token; patchTurn({ status: 'streaming', content: finalContent }); }
        },
        () => patchTurn({ status: 'done' }),
        (_mid, err) => patchTurn({ status: 'error', error: err }),
        () => {},
      );

      patchTurn({ status: 'done', content: finalContent, reasoning: finalReasoning || undefined });

      // Persiste o turno na sessão activa (ids de origem e alvo guardados).
      if (activeSessionId && finalContent.trim()) {
        try {
          await fetch(`/api/sessions/${activeSessionId}/crossexam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceModel, targetModel, action, content: finalContent, reasoning: finalReasoning || undefined }),
          });
        } catch { /* não-fatal */ }
      }
    } catch (err) {
      patchTurn({ status: 'error', error: err instanceof Error ? err.message : 'erro no cruzamento' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeSessionId]);

  // ── single-panel regenerate ────────────────────────────────────────────────
  // Re-dispara APENAS este modelo com a mesma pergunta/modo/papéis/grounding/anexo,
  // substituindo o conteúdo desse painel sem tocar nos restantes.
  const handleRegenerate = useCallback(async (modelId: ModelId) => {
    if (!query) return;
    updatePanel(modelId, {
      status: 'processing', content: '',
      reasoning: undefined, sources: undefined, error: undefined,
      unsupported: undefined, crossExams: undefined,
    });

    let content = '';
    let reasoning = '';
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, models: [modelId], keys: readApiKeys(), roles: readRoles(), useRoles: readUseRoles(), grounding, attachment: submittedAttachment ?? undefined }),
      });
      if (!resp.ok || !resp.body) throw new Error('regen request failed');

      await readSSE(
        resp.body,
        (mid, token, kind) => {
          if (kind === 'reasoning') { reasoning += token; updatePanel(mid, { status: 'streaming', reasoning }); }
          else                      { content  += token; updatePanel(mid, { status: 'streaming', content }); }
        },
        (mid) => updatePanel(mid, { status: 'done', content }),
        (mid, err) => updatePanel(mid, { status: 'error', error: err }),
        () => {},
        (mid, srcs) => updatePanel(mid, { sources: srcs }),
        (mid) => updatePanel(mid, { unsupported: true }),
      );
    } catch (err) {
      updatePanel(modelId, { status: 'error', error: err instanceof Error ? err.message : 'erro ao regenerar' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode, grounding, submittedAttachment, updatePanel]);

  const isRunning = phase === 'running' || phase === 'synthesis';

  return (
    <PageFrame
      scroll={false}
      title={
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setModeSelectorOpen((o) => !o)}
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
              color: 'var(--fg-muted)',
              background: 'var(--surface-3)',
              border: '0.5px solid var(--border)',
              borderRadius: 5, padding: '4px 9px', cursor: 'pointer',
              transition: 'color 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--cream)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; }}
          >
            {MODE_LABELS[mode].toUpperCase()}
          </button>
          <ModeSelector
            open={modeSelectorOpen}
            onClose={() => setModeSelectorOpen(false)}
            mode={mode}
            onSelect={handleModeSelect}
          />
        </div>
      }
      actions={
        <>
          {(pastTurns.length > 0 || query) && (
            <button
              onClick={handleNewConversation}
              title="Começar uma conversa nova"
              style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.3px',
                color: 'var(--fg-muted)',
                background: 'var(--surface-3)',
                border: '0.5px solid var(--border)',
                borderRadius: 5, padding: '4px 9px', cursor: 'pointer',
                transition: 'color 0.12s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--cream)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; }}
            >
              + Nova
            </button>
          )}
          {(processingCount > 0 || doneCount > 0) && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
              {processingCount > 0 && `${processingCount} a processar · `}
              {doneCount} concluída{doneCount !== 1 ? 's' : ''}
            </span>
          )}
          <div style={{
            display: 'flex', gap: 1,
            background: 'var(--surface-3)',
            borderRadius: 6, padding: 2,
            border: '0.5px solid var(--border)',
          }}>
            {([2, 3, 6] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                style={{
                  width: 32, height: 24, borderRadius: 4,
                  fontSize: 11, fontWeight: 500,
                  background: density === d ? 'var(--surface-2)' : 'transparent',
                  color: density === d ? 'var(--cream)' : 'var(--fg-muted)',
                  border: density === d ? '0.5px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                {d}×
              </button>
            ))}
          </div>
        </>
      }
    >
      {/* área que rola — histórico + ronda atual + síntese / estado vazio */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {pastTurns.map((t, i) => (
          <PastTurn key={i} turn={t} density={density} isMobile={isMobile} />
        ))}
        <QueryBubble query={query} attachment={submittedAttachment} />

        {query && (
          <PanelGrid
            states={panelStates}
            models={roundModels}
            density={density}
            grounding={grounding}
            onCrossExam={handleCrossExam}
            onRegenerate={handleRegenerate}
          />
        )}

        {(synthesisStatus !== 'idle') && (
          <SynthesisPanel status={synthesisStatus} content={synthesisContent} />
        )}

        {!query && (
          <ArenaEmpty
            models={selectedModels}
            density={density}
            onPickPrompt={handlePickPrompt}
            onReopen={handleReopen}
          />
        )}
      </div>

      <InputBar
        ref={inputBarRef}
        mode={mode}
        onModeSelect={handleModeSelect}
        onSubmit={handleSubmit}
        disabled={isRunning}
        grounding={grounding}
        onGrounding={setGrounding}
        selectedModels={selectedModels}
        onToggleModel={handleToggleModel}
      />
    </PageFrame>
  );
}
