// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — content data
// ────────────────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'claude',     name: 'Claude'     },
  { id: 'grok',       name: 'Grok'       },
  { id: 'chatgpt',    name: 'ChatGPT'    },
  { id: 'gemini',     name: 'Gemini'     },
  { id: 'perplexity', name: 'Perplexity' },
  { id: 'deepseek',   name: 'DeepSeek'   },
  { id: 'mistral',    name: 'Mistral'    },
  { id: 'cohere',     name: 'Cohere'     },
];

const DEFAULT_QUERY = 'Qual o impacto das redes de influência nos sistemas democráticos modernos?';

const RESPONSES = {
  claude:
    'As redes de influência operam por captura institucional, manufactura de consenso e erosão epistémica. O efeito não é um colapso visível, mas uma deriva — a janela de Overton desloca-se sem que ninguém pareça responsável. A democracia formal sobrevive; a deliberação substantiva atrofia.',
  grok:
    'Democracia é uma ficção útil. O que existe são oligarquias com eleições periódicas. As redes não corrompem o sistema — elas são o sistema. Quem o nega ou é ingénuo, ou faz parte da rede.',
  chatgpt:
    'Three dimensions matter: financial concentration, algoritmic amplification, e captura regulatória. A literatura empírica sugere que partidos com >40% de financiamento concentrado adoptam políticas significativamente desviadas da mediana do eleitor.',
  gemini:
    'Há um trade-off mensurável entre velocidade de circulação informacional e qualidade deliberativa. As redes aceleram o ciclo de feedback ao ponto de tornar a reflexão pública estruturalmente impossível. O problema é cinético, não moral.',
  perplexity:
    'Estudos do Pew (2024) e do Reuters Institute mostram que 63% dos cidadãos em democracias OECD identificam redes informais como "mais influentes que o voto". A erosão da confiança institucional precede — não segue — a polarização.',
  deepseek:
    'Modelando como rede dirigida com pesos de capital social, o equilíbrio estável favorece nós com alta centralidade de intermediação. O voto é ruído de baixa amplitude sobreposto a um sinal de coordenação oligárquica.',
  mistral:
    'A questão é mal-posta. Não há sistema democrático "puro" a ser corrompido — todas as democracias históricas foram redes de influência sobrepostas a procedimentos formais. A diferença actual é a escala e a opacidade.',
  cohere:
    'Operacionalmente: três mecanismos — lobbying directo, pré-compromisso de elites, e moldagem da agenda mediática. O terceiro é o mais consequente porque opera antes de qualquer decisão explícita ser tomada.',
};

const SYNTH_BLOCKS = [
  { label: 'CONSENSO', body: 'As oito vozes convergem num ponto: as redes de influência não são um defeito periférico do sistema democrático — são parte da sua estrutura operacional. A questão deixou de ser "se" e passou a ser "como" e "com que magnitude". Captura institucional, manufactura de consenso por amplificação algorítmica e concentração financeira aparecem repetidos em pelo menos cinco respostas independentes.' },
  { label: 'DIVERGÊNCIA', body: 'Grok e Mistral pressionam para uma posição cínica — a democracia "pura" como ficção retórica. Claude, Gemini e Cohere mantêm uma análise clínica, identificando os mesmos fenómenos sem recurso ao desespero. ChatGPT e DeepSeek tratam o problema como mensurável; Perplexity ancora em estudos empíricos. A divergência é tonal, não substantiva.' },
  { label: 'INSIGHT', body: 'Nenhum dos oito modelos abordou contra-mecanismos viáveis: jornalismo investigativo independente, conselhos cidadãos, transparência radical de financiamento. A análise é unanimemente diagnóstica, raramente prescritiva — uma assimetria que vale a pena interrogar na próxima iteração.' },
];

const MODES = [
  { id: 'rapido',        label: '/Rápido',        desc: 'Respostas curtas, sem reflexão prolongada.',     hint: 'baixa latência'   },
  { id: 'raciocinio',    label: '/Raciocínio',    desc: 'Cadeias de pensamento estendidas antes da resposta.', hint: 'pensa antes' },
  { id: 'pesquisa',      label: '/Pesquisa',      desc: 'Cada modelo consulta fontes externas em tempo real.', hint: 'web · papers' },
  { id: 'investigacao',  label: '/Investigação',  desc: 'Múltiplas iterações, verificação cruzada, dossier.',  hint: 'profundo'    },
];

const SUGGESTIONS = [
  'Teoria dos jogos',
  'Poder e instituições',
  'Psicologia da manipulação',
  'Sistemas complexos',
];

const STATUS_LABEL = {
  processing: 'processando',
  streaming:  'streaming',
  done:       'concluído',
};

const LIBRARY_SESSIONS = [
  { title: 'Redes de influência democrática',     when: 'hoje 14:32',  mode: '/Raciocínio',   voices: 8,
    preview: 'Qual o impacto das redes de influência nos sistemas democráticos modernos?' },
  { title: 'Teoria dos jogos aplicada',           when: 'hoje 11:07',  mode: '/Investigação', voices: 8,
    preview: 'Como modelar coligações instáveis em equilíbrios não-cooperativos repetidos?' },
  { title: 'Psicologia da manipulação',           when: 'ontem 22:14', mode: '/Pesquisa',     voices: 4,
    preview: 'Quais os mecanismos cognitivos explorados em campanhas de desinformação?' },
  { title: 'Sistemas complexos e caos',           when: 'ontem 18:43', mode: '/Raciocínio',   voices: 8,
    preview: 'Onde está a fronteira entre comportamento caótico e meramente complexo?' },
  { title: 'Poder e arquitectura institucional',  when: 'ontem 09:21', mode: '/Investigação', voices: 8,
    preview: 'Que arranjos institucionais resistem melhor a captura por elites?' },
  { title: 'Filosofia da mente e consciência',    when: 'seg 20:11',   mode: '/Raciocínio',   voices: 8,
    preview: 'A consciência é um fenómeno computacional ou irredutivelmente físico?' },
  { title: 'Geopolítica do Indo-Pacífico',        when: 'seg 15:38',   mode: '/Pesquisa',     voices: 8,
    preview: 'Que cenários de confrontação Taiwan-China são plausíveis até 2030?' },
  { title: 'Epistemologia e certeza',             when: 'dom 11:02',   mode: '/Investigação', voices: 4,
    preview: 'Quão justificada pode ser uma crença sem critério externo de validação?' },
  { title: 'Linguagem e poder simbólico',         when: 'sáb 17:55',   mode: '/Rápido',       voices: 2,
    preview: 'Como Bourdieu conceptualiza a violência simbólica em práticas linguísticas?' },
];

Object.assign(window, {
  MODELS, DEFAULT_QUERY, RESPONSES, SYNTH_BLOCKS, MODES, SUGGESTIONS,
  STATUS_LABEL, LIBRARY_SESSIONS,
});
