import { streamText, type JSONValue } from 'ai';
import { MODELS, SYSTEM_PROMPTS, type ApiKeys, type ModelId, type ModeId } from './models';

export interface StreamToken {
  model: ModelId;
  /** 'text' = resposta; 'reasoning' = cadeia de pensamento. Ausente em done/error. */
  kind?: 'text' | 'reasoning';
  token?: string;
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

export async function orchestrate(
  opts: OrchestrateOptions,
  onToken: (event: StreamToken) => void,
): Promise<void> {
  const { query, mode, models: modelIds, keys, roles, useRoles = true } = opts;
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

        const result = streamText({
          model: modelConfig.getModel(keys),
          system,
          messages: [{ role: 'user', content: query }],
          providerOptions: thinkingOptions(modelConfig.id),
        });

        await withTimeout(
          (async () => {
            // fullStream separa a cadeia de pensamento (reasoning) da resposta (text).
            for await (const part of result.fullStream) {
              if (part.type === 'text-delta') {
                onToken({ model: modelConfig.id, kind: 'text', token: part.textDelta });
              } else if (part.type === 'reasoning') {
                onToken({ model: modelConfig.id, kind: 'reasoning', token: part.textDelta });
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

        onToken({ model: modelConfig.id, done: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'erro desconhecido';
        onToken({ model: modelConfig.id, error: message });
      }
    }),
  );
}
