import { anthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { mistral } from '@ai-sdk/mistral';
import type { LanguageModelV1 } from 'ai';

export type ModelId =
  | 'claude'
  | 'chatgpt'
  | 'gemini'
  | 'grok'
  | 'perplexity'
  | 'deepseek'
  | 'mistral'
  | 'zai'
  | 'manus';

export type ModeId = 'rapido' | 'raciocinio' | 'pesquisa' | 'investigacao' | 'sintese';

export interface ModelConfig {
  id: ModelId;
  name: string;
  disabled: boolean;
  streamDelay: number; // ms offset for staggered animation
  getModel: () => LanguageModelV1;
}

const perplexityClient = createOpenAI({
  baseURL: 'https://api.perplexity.ai',
  apiKey: process.env.PERPLEXITY_API_KEY ?? '',
});

const deepseekClient = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

const zaiClient = createOpenAI({
  baseURL: 'https://api.z.ai/api/paas/v4',
  apiKey: process.env.ZAI_API_KEY ?? '',
});

export const MODELS: ModelConfig[] = [
  {
    id: 'claude',
    name: 'Claude',
    disabled: false,
    streamDelay: 0,
    getModel: () => anthropic('claude-sonnet-4-20250514'),
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    disabled: false,
    streamDelay: 40,
    getModel: () => openai('gpt-4o'),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    disabled: false,
    streamDelay: 80,
    getModel: () => google('gemini-1.5-pro'),
  },
  {
    id: 'grok',
    name: 'Grok',
    disabled: false,
    streamDelay: 60,
    getModel: () => xai('grok-2'),
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    disabled: false,
    streamDelay: 100,
    getModel: () => perplexityClient('sonar-pro'),
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    disabled: false,
    streamDelay: 130,
    getModel: () => deepseekClient('deepseek-chat'),
  },
  {
    id: 'mistral',
    name: 'Mistral',
    disabled: false,
    streamDelay: 90,
    getModel: () => mistral('mistral-large-latest'),
  },
  {
    id: 'zai',
    name: 'Z.ai GLM',
    disabled: false,
    streamDelay: 50,
    getModel: () => zaiClient('glm-5.1'),
  },
  {
    id: 'manus',
    name: 'Manus',
    disabled: true,
    streamDelay: 0,
    getModel: () => {
      throw new Error('Manus API not yet available');
    },
  },
];

export const ACTIVE_MODELS = MODELS.filter((m) => !m.disabled);

export function getModelById(id: ModelId): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export const SYSTEM_PROMPTS: Record<ModeId, string> = {
  rapido:
    'Responde directamente. Máximo 120 palavras. Sem preâmbulo, sem conclusão desnecessária.',
  raciocinio:
    'Raciocina passo a passo antes de responder. Sê exaustivo. Identifica pressupostos e implicações.',
  pesquisa:
    'Prioriza factos verificáveis. Indica fontes e estudos quando relevante. Distingue consenso de controvérsia.',
  investigacao:
    'Analisa em profundidade. Identifica pressupostos, contradições, lacunas e perspectivas alternativas. Não simplifiques.',
  sintese:
    'És um sintetizador preciso de respostas de múltiplas IAs. A tua única função é sintetizar com rigor.',
};

export const MODE_LABELS: Record<ModeId, string> = {
  rapido:       '/Rápido',
  raciocinio:   '/Raciocínio',
  pesquisa:     '/Pesquisa',
  investigacao: '/Investigação',
  sintese:      '/Síntese',
};

export const MODE_DESCRIPTIONS: Record<ModeId, { desc: string; hint: string }> = {
  rapido:       { desc: 'Resposta directa. Máximo 120 palavras.',      hint: 'baixa latência' },
  raciocinio:   { desc: 'Cadeia de pensamento. Respostas exaustivas.', hint: 'pensa antes'   },
  pesquisa:     { desc: 'Grounding factual. Fontes priorizadas.',       hint: 'web · papers'  },
  investigacao: { desc: 'Análise profunda. Pressupostos mapeados.',     hint: 'profundo'      },
  sintese:      { desc: 'Síntese automática das 8 vozes.',              hint: 'interno'       },
};
