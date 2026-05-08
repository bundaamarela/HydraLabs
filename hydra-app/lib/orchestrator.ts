import { streamText } from 'ai';
import { MODELS, SYSTEM_PROMPTS, type ModelId, type ModeId } from './models';

export interface StreamToken {
  model: ModelId;
  token?: string;
  done?: boolean;
  error?: string;
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
  query: string,
  mode: ModeId,
  modelIds: ModelId[],
  onToken: (event: StreamToken) => void,
): Promise<void> {
  const systemPrompt = SYSTEM_PROMPTS[mode];

  const activeModels = MODELS.filter(
    (m) => !m.disabled && modelIds.includes(m.id),
  );

  await Promise.allSettled(
    activeModels.map(async (modelConfig) => {
      try {
        const result = streamText({
          model: modelConfig.getModel(),
          system: systemPrompt,
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
