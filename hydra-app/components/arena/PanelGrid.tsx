'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ACTIVE_MODELS, type ModelId } from '@/lib/models';
import { Panel, type PanelStatus } from './Panel';

export interface ModelState {
  status: PanelStatus;
  content: string;
  reasoning?: string;
  sources?: { url: string; title?: string }[];
  error?: string;
}

interface PanelGridProps {
  states: Partial<Record<ModelId, ModelState>>;
  density: 2 | 3 | 6;
  grounding?: boolean;
}

const STAGGER = 0.04; // 40ms between panels
const DEFAULT_STATE: ModelState = { status: 'idle', content: '' };

export function PanelGrid({ states, density, grounding }: PanelGridProps) {
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
                grounding={grounding}
                error={state.error}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
