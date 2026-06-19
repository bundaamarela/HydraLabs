import { NextRequest } from 'next/server';
import { orchestrate, type StreamToken } from '@/lib/orchestrator';
import { getModelById, type ApiKeys, type CrossAction, type ModelId } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface CrossExamRequest {
  sourceModel: ModelId;
  sourceAnswer: string;
  targetModel: ModelId;
  action: CrossAction;
  originalQuery: string;
  keys?: ApiKeys;
}

// Descrição da tarefa por acção (entra no prompt do utilizador).
const ACTION_TASK: Record<CrossAction, string> = {
  criticar: 'critica esta resposta — aponta falhas, omissões, saltos lógicos e fraquezas',
  refutar:  'refuta esta resposta — contesta as suas conclusões com argumentos e contra-evidência',
  melhorar: 'melhora esta resposta — corrige erros, preenche lacunas e torna-a mais forte e completa',
};

const CROSS_SYSTEM =
  'És um avaliador crítico, rigoroso e específico. Avalias a resposta de outro modelo de IA à pergunta de um utilizador. Sê concreto: cita o que está em causa, fundamenta cada ponto e evita generalidades.';

function encodeSSE(event: StreamToken): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: CrossExamRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { sourceModel, sourceAnswer, targetModel, action, originalQuery, keys } = body;

  if (!sourceAnswer || typeof sourceAnswer !== 'string' || !sourceAnswer.trim()) {
    return new Response('sourceAnswer is required', { status: 400 });
  }
  if (!targetModel || !getModelById(targetModel) || getModelById(targetModel)!.disabled) {
    return new Response('invalid targetModel', { status: 400 });
  }
  if (!action || !['criticar', 'refutar', 'melhorar'].includes(action)) {
    return new Response('invalid action', { status: 400 });
  }

  const sourceName = getModelById(sourceModel)?.name ?? sourceModel;
  const prompt =
    `Resposta original de ${sourceName} à pergunta «${originalQuery ?? ''}»:\n\n` +
    `«${sourceAnswer}»\n\n` +
    `Tarefa: ${ACTION_TASK[action]}. Sê específico e rigoroso.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await orchestrate(
          {
            query: prompt,
            mode: 'raciocinio',
            models: [targetModel],
            keys: keys ?? {},
            useRoles: false,
            system: CROSS_SYSTEM,
          },
          (event) => {
            controller.enqueue(encoder.encode(encodeSSE(event)));
          },
        );
      } finally {
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
