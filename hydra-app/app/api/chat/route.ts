import { NextRequest } from 'next/server';
import { orchestrate, type StreamToken } from '@/lib/orchestrator';
import type { ApiKeys, ModelId, ModeId } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequest {
  query: string;
  mode: ModeId;
  models: ModelId[];
  keys?: ApiKeys;
  roles?: Record<string, string>;
  useRoles?: boolean;
  grounding?: boolean;
}

function encodeSSE(event: StreamToken): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { query, mode, models, keys, roles, useRoles, grounding } = body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return new Response('query is required', { status: 400 });
  }
  if (!mode || !['rapido', 'raciocinio', 'pesquisa', 'investigacao', 'sintese'].includes(mode)) {
    return new Response('invalid mode', { status: 400 });
  }
  if (!Array.isArray(models) || models.length === 0) {
    return new Response('models array is required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await orchestrate(
          { query, mode, models, keys: keys ?? {}, roles, useRoles: useRoles ?? true, grounding },
          (event) => {
            controller.enqueue(encoder.encode(encodeSSE(event)));
          },
        );
      } finally {
        // Signal all streams complete
        controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
