import type { ModelId } from './models';

/**
 * Papel (persona via system-prompt) por modelo activo. Cada modelo recebe uma
 * lente distinta para que a arena produza perspectivas variadas em vez de seis
 * respostas quase idênticas. Editável e persistido no cliente (localStorage
 * `hydra_model_roles`); o orchestrator anexa o papel ao prompt do modo.
 */
export const DEFAULT_ROLES: Partial<Record<ModelId, string>> = {
  chatgpt:  'Generalista equilibrado. Resposta completa e neutra.',
  grok:     'Voz cética e contrária. Questiona premissas; atento ao presente.',
  claude:   'Analista estruturado. Raciocínio longo, distinções claras.',
  gemini:   'Verificador factual. Prioriza precisão e fundamentação.',
  deepseek: 'Disseca a lógica passo a passo. Rigor matemático.',
  kimi:     'Sintetizador. Liga ideias dispersas num todo coerente.',
};
