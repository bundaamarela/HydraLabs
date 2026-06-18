import { streamText } from 'ai';
import { MODELS, SYSTEM_PROMPTS, type ApiKeys, type ModelId, type ModeId } from './models';

export interface StreamToken {
  model: ModelId;
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
        });

        await withTimeout(
          (async () => {
            for await (const chunk of result.textStream) {
              onToken({ model: modelConfig.id, token: chunk });
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
