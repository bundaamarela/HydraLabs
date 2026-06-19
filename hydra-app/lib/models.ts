import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from 'ai';

export type ModelId =
  | 'chatgpt'
  | 'grok'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'kimi'
  | 'perplexity'
  | 'mistral'
  | 'zai'
  | 'manus';

export type ModeId =
  | 'rapido'
  | 'raciocinio'
  | 'pesquisa'
  | 'investigacao'
  | 'sintese'
  | 'direto'
  | 'consolidacao';

/**
 * Chaves API por pedido — lidas no cliente do localStorage `hydra_api_keys`
 * e reenviadas em cada chamada. Quando ausentes, cai-se para a env var
 * correspondente no servidor.
 */
export interface ApiKeys {
  OPENAI_API_KEY?: string;
  XAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
}

export interface ModelConfig {
  id: ModelId;
  name: string;
  disabled: boolean;
  streamDelay: number; // ms offset for staggered animation
  getModel: (keys: ApiKeys, opts?: { grounding?: boolean }) => LanguageModelV1;
}

// Chave do pedido → env var do servidor → undefined (deixa o SDK falhar no pedido).
const pick = (fromKeys: string | undefined, envVar: string | undefined) =>
  fromKeys || envVar || undefined;

export const MODELS: ModelConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    disabled: false,
    streamDelay: 0,
    getModel: (keys) =>
      createOpenAI({ apiKey: pick(keys.OPENAI_API_KEY, process.env.OPENAI_API_KEY) })('gpt-5.5'),
  },
  {
    id: 'grok',
    name: 'Grok',
    disabled: false,
    streamDelay: 40,
    getModel: (keys) =>
      createOpenAICompatible({
        name: 'xai',
        baseURL: 'https://api.x.ai/v1',
        apiKey: pick(keys.XAI_API_KEY, process.env.XAI_API_KEY),
      })('grok-4.3'),
  },
  {
    id: 'claude',
    name: 'Claude',
    disabled: false,
    streamDelay: 80,
    getModel: (keys) =>
      createAnthropic({ apiKey: pick(keys.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY) })(
        'claude-sonnet-4-6',
      ),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    disabled: false,
    streamDelay: 120,
    // Gemini 3.1 exige uma chave API *restrita* — a Google bloqueia chaves sem
    // restrições a partir de 2026-06-19. Modelo de raciocínio: textStream traz
    // apenas a resposta, não o "thinking". Com grounding, usa Google Search.
    getModel: (keys, opts) =>
      createGoogleGenerativeAI({
        apiKey: pick(keys.GOOGLE_GENERATIVE_AI_API_KEY, process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      })('gemini-3.1-pro-preview', opts?.grounding ? { useSearchGrounding: true } : undefined),
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    disabled: false,
    streamDelay: 160,
    // Modelo de raciocínio: textStream traz só a resposta, não a cadeia de pensamento.
    getModel: (keys) =>
      createOpenAICompatible({
        name: 'deepseek',
        baseURL: 'https://api.deepseek.com',
        apiKey: pick(keys.DEEPSEEK_API_KEY, process.env.DEEPSEEK_API_KEY),
      })('deepseek-v4-pro'),
  },
  {
    id: 'kimi',
    name: 'Kimi',
    disabled: false,
    streamDelay: 200,
    // Moonshot Kimi — modelo de raciocínio. NÃO definir temperature/top_p/n
    // (são fixados pelo modo). textStream traz só a resposta.
    getModel: (keys) =>
      createOpenAICompatible({
        name: 'moonshot',
        baseURL: 'https://api.moonshot.ai/v1',
        apiKey: pick(keys.MOONSHOT_API_KEY, process.env.MOONSHOT_API_KEY),
      })('kimi-k2.6'),
  },

  // ── desactivados — config preservada, nunca despachados (ver orchestrator) ──
  {
    id: 'perplexity',
    name: 'Perplexity',
    disabled: true,
    streamDelay: 0,
    getModel: () => {
      throw new Error('Perplexity desactivado');
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    disabled: true,
    streamDelay: 0,
    getModel: () => {
      throw new Error('Mistral desactivado');
    },
  },
  {
    id: 'zai',
    name: 'Z.ai GLM',
    disabled: true,
    streamDelay: 0,
    getModel: () => {
      throw new Error('Z.ai desactivado');
    },
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

/**
 * Modalidades de anexo suportadas por modelo. Texto é sempre aceite (anexado ao
 * prompt); imagem/PDF dependem do modelo. Quando não suportado, o orchestrator
 * envia só o texto e marca o painel como `unsupported`.
 */
export const MODALITIES: Record<ModelId, { image: boolean; pdf: boolean }> = {
  chatgpt:    { image: true,  pdf: true  },
  grok:       { image: true,  pdf: false },
  claude:     { image: true,  pdf: true  },
  gemini:     { image: true,  pdf: true  },
  deepseek:   { image: false, pdf: false },
  kimi:       { image: true,  pdf: true  },
  perplexity: { image: false, pdf: false },
  mistral:    { image: false, pdf: false },
  zai:        { image: false, pdf: false },
  manus:      { image: false, pdf: false },
};

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
  direto:
    'Responde de forma directa e final. Apenas a resposta — sem preâmbulo, sem justificação, sem ressalvas. Conciso e decidido.',
  consolidacao:
    'O utilizador traz uma ideia. A tua função é consolidá-la e torná-la sólida. Gera novas direcções, extensões e aplicações da ideia (criatividade) e fundamenta cada uma com o máximo de dados, evidências, mecanismos, precedentes históricos, analogias e enquadramentos teóricos (dados massivos). Antecipa objecções e refuta-as. Densidade máxima, exaustivo e estruturado. Não resumas — expande e fundamenta.',
};

/** IDs de modo válidos (derivados dos prompts) — usado na validação da API. */
export const MODE_IDS = Object.keys(SYSTEM_PROMPTS) as ModeId[];

/**
 * Tecto de tokens por modo, quando definido. 'direto' fica enxuto e barato;
 * 'consolidacao' usa um tecto alto para respostas densas e exaustivas. Modos
 * sem entrada usam o default do SDK (sem tecto explícito).
 */
export const MODE_MAX_TOKENS: Partial<Record<ModeId, number>> = {
  direto: 1024,
  consolidacao: 8000,
};

export const MODE_LABELS: Record<ModeId, string> = {
  rapido:       '/Rápido',
  raciocinio:   '/Raciocínio',
  pesquisa:     '/Pesquisa',
  investigacao: '/Investigação',
  sintese:      '/Síntese',
  direto:       '/Directo',
  consolidacao: '/Consolidação',
};

export const MODE_DESCRIPTIONS: Record<ModeId, { desc: string; hint: string }> = {
  rapido:       { desc: 'Resposta directa. Máximo 120 palavras.',      hint: 'baixa latência' },
  raciocinio:   { desc: 'Cadeia de pensamento. Respostas exaustivas.', hint: 'pensa antes'   },
  pesquisa:     { desc: 'Grounding factual. Fontes priorizadas.',       hint: 'web · papers'  },
  investigacao: { desc: 'Análise profunda. Pressupostos mapeados.',     hint: 'profundo'      },
  sintese:      { desc: 'Síntese automática das 6 vozes.',              hint: 'interno'       },
  direto:       { desc: 'Resposta final, sem rodeios.',                 hint: 'directo'       },
  consolidacao: { desc: 'Criatividade + dados massivos para solidificar uma ideia.', hint: 'denso · web' },
};
