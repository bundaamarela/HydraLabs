import { streamText, type JSONValue } from 'ai';
import { MODELS, MODALITIES, SYSTEM_PROMPTS, type ApiKeys, type ModelId, type ModeId } from './models';

export interface SourceRef {
  url: string;
  title?: string;
}

export interface Attachment {
  kind: 'image' | 'pdf' | 'text';
  /** image/pdf: data URL base64; text: conteúdo inline. */
  data: string;
  mediaType: string;
  name: string;
}

export interface StreamToken {
  model: ModelId;
  /** 'text' = resposta; 'reasoning' = pensamento; 'sources' = fontes web. */
  kind?: 'text' | 'reasoning' | 'sources';
  token?: string;
  sources?: SourceRef[];
  /** O modelo não suporta a modalidade do anexo: respondeu só ao texto. */
  unsupported?: boolean;
  done?: boolean;
  error?: string;
}

export interface OrchestrateOptions {
  query: string;
  mode: ModeId;
  models: ModelId[];
  keys: ApiKeys;
  /** Papéis (personas) por modelo, anexados ao prompt do modo quando activos. */
  roles?: Partial<Record<ModelId, string>>;
  /** Quando false, ignora os papéis (comportamento simples). Default: true. */
  useRoles?: boolean;
  /** Pesquisa web ao vivo (grok: Web+X; gemini: Google Search). Os outros ignoram. */
  grounding?: boolean;
  /** Anexo (imagem/PDF/texto). Modelos sem suporte recebem só o texto. */
  attachment?: Attachment;
}

// Conteúdo da mensagem de utilizador: string simples ou partes multimodais.
type UserContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string }
      | { type: 'file'; data: string; mimeType: string }
    >;

/**
 * Constrói o conteúdo por modelo a partir do anexo. Texto é sempre anexado ao
 * prompt; imagem/PDF só entram se o modelo suportar a modalidade — caso
 * contrário envia-se só o texto e marca-se o painel como `unsupported`.
 */
function buildUserContent(
  query: string,
  attachment: Attachment | undefined,
  modalities: { image: boolean; pdf: boolean },
): { content: UserContent; unsupported: boolean } {
  if (!attachment) return { content: query, unsupported: false };

  if (attachment.kind === 'text') {
    return {
      content: `${query}\n\n--- Documento anexado: ${attachment.name} ---\n${attachment.data}`,
      unsupported: false,
    };
  }

  const supported = attachment.kind === 'image' ? modalities.image : modalities.pdf;
  if (!supported) return { content: query, unsupported: true };

  const parts: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string }
    | { type: 'file'; data: string; mimeType: string }
  > = [{ type: 'text', text: query }];

  if (attachment.kind === 'image') {
    parts.push({ type: 'image', image: attachment.data });
  } else {
    parts.push({ type: 'file', data: attachment.data, mimeType: attachment.mediaType || 'application/pdf' });
  }
  return { content: parts, unsupported: false };
}

const TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

/**
 * Activa "thinking"/reasoning onde o provider/SDK instalado o suporta. As
 * opções são provider-scoped: cada chave só é lida pelo provider respectivo, os
 * outros ignoram-na (degradação suave). deepseek/kimi/grok via openai-compatible
 * já mapeiam reasoning_content para partes de reasoning — sem flag extra.
 */
function thinkingOptions(id: ModelId): Record<string, Record<string, JSONValue>> | undefined {
  switch (id) {
    case 'claude':
      return { anthropic: { thinking: { type: 'enabled', budgetTokens: 4000 } } };
    case 'gemini':
      return { google: { thinkingConfig: { includeThoughts: true } } };
    case 'chatgpt':
      return { openai: { reasoningEffort: 'medium' } };
    default:
      return undefined;
  }
}

/**
 * Opções de provider para um modelo: thinking + (quando grounding) a pesquisa
 * ao vivo do grok. O grok corre via openai-compatible (name 'xai'); o
 * @ai-sdk/openai-compatible instalado espalha providerOptions.xai directamente
 * no corpo do pedido, por isso passamos os search_parameters do xAI aí. O gemini
 * activa o Google Search via setting do modelo (useSearchGrounding), não aqui.
 */
function buildProviderOptions(
  id: ModelId,
  grounding: boolean,
): Record<string, Record<string, JSONValue>> | undefined {
  const po: Record<string, Record<string, JSONValue>> = { ...(thinkingOptions(id) ?? {}) };
  if (grounding && id === 'grok') {
    po.xai = {
      search_parameters: {
        mode: 'auto',
        return_citations: true,
        sources: [{ type: 'web' }, { type: 'x' }],
      },
    };
  }
  return Object.keys(po).length ? po : undefined;
}

export async function orchestrate(
  opts: OrchestrateOptions,
  onToken: (event: StreamToken) => void,
): Promise<void> {
  const { query, mode, models: modelIds, keys, roles, useRoles = true } = opts;
  const grounding = opts.grounding === true;
  const basePrompt = SYSTEM_PROMPTS[mode];

  // Despacha apenas modelos activos e pedidos. Os desactivados ficam de fora.
  const activeModels = MODELS.filter(
    (m) => !m.disabled && modelIds.includes(m.id),
  );

  await Promise.allSettled(
    activeModels.map(async (modelConfig) => {
      try {
        // Prompt final = prompt do modo + (papel do modelo, quando activo).
        const role = useRoles ? roles?.[modelConfig.id]?.trim() : undefined;
        const system = role ? `${basePrompt}\n\n${role}` : basePrompt;

        const { content, unsupported } = buildUserContent(
          query,
          opts.attachment,
          MODALITIES[modelConfig.id],
        );
        if (unsupported) onToken({ model: modelConfig.id, unsupported: true });

        const result = streamText({
          model: modelConfig.getModel(keys, { grounding }),
          system,
          messages: [{ role: 'user', content }],
          providerOptions: buildProviderOptions(modelConfig.id, grounding),
        });

        const sources: SourceRef[] = [];

        await withTimeout(
          (async () => {
            // fullStream separa reasoning, resposta e fontes (source parts).
            for await (const part of result.fullStream) {
              if (part.type === 'text-delta') {
                onToken({ model: modelConfig.id, kind: 'text', token: part.textDelta });
              } else if (part.type === 'reasoning') {
                onToken({ model: modelConfig.id, kind: 'reasoning', token: part.textDelta });
              } else if (part.type === 'source') {
                const s = part.source;
                if (s && s.url) sources.push({ url: s.url, title: s.title });
              } else if (part.type === 'error') {
                const e = part.error;
                throw e instanceof Error
                  ? e
                  : new Error(typeof e === 'string' ? e : 'erro de stream');
              }
            }
          })(),
          TIMEOUT_MS,
        );

        if (sources.length) {
          onToken({ model: modelConfig.id, kind: 'sources', sources });
        }
        onToken({ model: modelConfig.id, done: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'erro desconhecido';
        onToken({ model: modelConfig.id, error: message });
      }
    }),
  );
}
