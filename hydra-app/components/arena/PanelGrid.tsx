'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getModelById, type CrossAction, type ModelId } from '@/lib/models';
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

const STAGGER = 0.04; // 40ms between panels
const DEFAULT_STATE: ModelState = { status: 'idle', content: '' };

export function PanelGrid({ states, models, density, grounding, onCrossExam, onRegenerate }: PanelGridProps) {
  const configs = models.map((id) => getModelById(id)).filter((m): m is NonNullable<typeof m> => !!m);
  // Grelha sã para 1–6: nunca mais colunas do que painéis.
  const cols = Math.min(density, Math.max(configs.length, 1));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10,
      padding: '12px 16px',
    }}>
      <AnimatePresence>
        {configs.map((model, index) => {
          const state = states[model.id] ?? DEFAULT_STATE;
          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: index * STAGGER, ease: 'easeOut' }}
              layout
            >
              <Panel
                model={model}
                status={state.status}
                content={state.content}
                reasoning={state.reasoning}
                sources={state.sources}
                unsupported={state.unsupported}
                crossExams={state.crossExams}
                crossTargetIds={models}
                grounding={grounding}
                error={state.error}
                onCrossExam={
                  onCrossExam
                    ? (target, action) => onCrossExam(model.id, state.content, target, action)
                    : undefined
                }
                onRegenerate={onRegenerate ? () => onRegenerate(model.id) : undefined}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
