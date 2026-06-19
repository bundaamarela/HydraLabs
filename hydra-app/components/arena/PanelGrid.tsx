'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ACTIVE_MODELS, type CrossAction, type ModelId } from '@/lib/models';
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
  density: 2 | 3 | 6;
  grounding?: boolean;
  onCrossExam?: (sourceModel: ModelId, sourceAnswer: string, targetModel: ModelId, action: CrossAction) => void;
}

const STAGGER = 0.04; // 40ms between panels
const DEFAULT_STATE: ModelState = { status: 'idle', content: '' };

export function PanelGrid({ states, density, grounding, onCrossExam }: PanelGridProps) {
  // 6 modelos activos: densidade 3 → grelha 3×2.
  const cols = Math.min(density, 6);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 10,
      padding: '12px 16px',
    }}>
      <AnimatePresence>
        {ACTIVE_MODELS.map((model, index) => {
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
                grounding={grounding}
                error={state.error}
                onCrossExam={
                  onCrossExam
                    ? (target, action) => onCrossExam(model.id, state.content, target, action)
                    : undefined
                }
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
