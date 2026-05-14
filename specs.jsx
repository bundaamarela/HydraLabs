// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — design specs handoff view
// Tokens, type, spacing, motion documentados para entrega ao Claude Code.
// ────────────────────────────────────────────────────────────────────────────

const COLOR_TOKENS = [
  { name: '--surface',    hex: '#0C0B09', use: 'Fundo da aplicação. Preto quase absoluto.' },
  { name: '--surface-2',  hex: '#161410', use: 'Caixa da query, input bar, popovers.' },
  { name: '--surface-3',  hex: '#1E1C18', use: 'Chips, badges, botões secundários.' },
  { name: '--border',     hex: '#2A2824', use: 'Bordas subtis (0.5px) sobre fundos escuros.' },
  { name: '--cream',      hex: '#F4EFE3', use: 'Painéis de resposta, botão Enviar, modo activo.' },
  { name: '--cream-2',    hex: '#EAE4D6', use: 'Divisores e badges sobre creme.' },
  { name: '--ink',        hex: '#1A1714', use: 'Texto principal nos painéis. Ponto de modelo.' },
  { name: '--ink-2',      hex: '#3A3530', use: 'Corpo dos painéis, detalhes secundários.' },
  { name: '--fg-muted',   hex: '#8A8480', use: 'Labels, status, texto desbotado em escuro.' },
  { name: '--fg-faint',   hex: '#4A463F', use: 'Caret e marcadores muito desbotados.' },
  { name: '--fg-quote',   hex: '#B0A898', use: 'Texto da query actual (entre aspas).' },
];

const TYPE_TOKENS = [
  { label: 'Brand',          spec: '17px / 500 / -0.5px',  sample: 'Hydra Labs' },
  { label: 'Modelo (label)', spec: '10px / 500 / +0.5px UPPER', sample: 'CLAUDE' },
  { label: 'Status',         spec: '9px  / 400 / +0.2px',  sample: 'streaming' },
  { label: 'Corpo painel',   spec: '12px / 400 / -0.1px / 1.65', sample: 'As redes operam por…' },
  { label: 'Query bubble',   spec: '13px / 400 / -0.1px / 1.5',  sample: '"Qual o impacto…"' },
  { label: 'Síntese H',      spec: '14px / 500 / -0.4px',  sample: 'Síntese' },
  { label: 'Síntese corpo',  spec: '13.5px / 400 / -0.15 / 1.7', sample: 'Convergência…' },
  { label: 'Input',          spec: '13px / 400 / -0.1px',  sample: 'Faz a tua pergunta…' },
  { label: 'Chip',           spec: '11px / 400 / -0.05px', sample: 'Teoria dos jogos' },
  { label: 'Botão',          spec: '12px / 500 / -0.1px',  sample: 'Enviar' },
];

const SPACE_TOKENS = [
  { tok: 'gap painéis',     val: '8px'  },
  { tok: 'padding painel',  val: '13px 15px' },
  { tok: 'padding input',   val: '12px 14px' },
  { tok: 'padding chip',    val: '5px 12px'  },
  { tok: 'padding botão',   val: '7px 16px'  },
  { tok: 'r-panel',         val: '12px' },
  { tok: 'r-input',         val: '14px' },
  { tok: 'r-pill',          val: '20px' },
  { tok: 'r-btn',           val: '8px'  },
  { tok: 'border-width',    val: '0.5px' },
];

const MOTION_TOKENS = [
  { name: 'Entrada painéis',    spec: 'opacity 0→1 + translateY(8px→0) · 420ms · cubic-bezier(.2,.6,.2,1) · stagger 40ms' },
  { name: 'Pontos processando', spec: 'scale 1→1.5 · opacity .25→.9 · 1.5s ease-in-out infinite · delay 0.18s entre pontos' },
  { name: 'Caret streaming',    spec: 'opacity 1↔0 · 1s step-end infinite' },
  { name: 'Síntese',            spec: 'opacity 0→1 + translateY(12px→0) · 550ms' },
  { name: 'Mode popover',       spec: 'opacity 0→1 + scale(.985→1) · 180ms' },
  { name: 'Botão Enviar :hover', spec: 'transform: scale(0.97) · 150ms' },
  { name: 'Chip :hover',        spec: 'background → #252320 · 150ms' },
];

function Swatch({ hex }) {
  return <div style={{
    width: 28, height: 28, borderRadius: 6,
    background: hex, flexShrink: 0,
    border: '0.5px solid rgba(244,239,227,.08)',
  }} />;
}

function SpecBlock({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{
        margin: '0 0 12px',
        fontSize: 10, fontWeight: 500, color: 'var(--cream)',
        letterSpacing: '0.6px', textTransform: 'uppercase',
      }}>{title}</h3>
      {children}
    </section>
  );
}

function SpecsView() {
  return (
    <div style={{ color: 'var(--fg)' }}>
      <header style={{ marginBottom: 28 }}>
        <h2 style={{
          margin: '0 0 6px', fontSize: 22, fontWeight: 500,
          letterSpacing: '-0.6px', color: 'var(--cream)',
        }}>Hydra Labs — design tokens</h2>
        <p style={{
          margin: 0, fontSize: 12, color: 'var(--fg-muted)',
          letterSpacing: '-0.1px', lineHeight: 1.6,
        }}>
          Sistema monocromático estrito. Zero cores, zero gradientes, zero sombras decorativas.
          Tipografia exclusivamente Apple system stack. Pesos 400 e 500 apenas.
        </p>
      </header>

      <SpecBlock title="Cor">
        <div style={{ display: 'grid', gap: 1, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {COLOR_TOKENS.map(t => (
            <div key={t.name} style={{
              display: 'grid', gridTemplateColumns: '40px 130px 80px 1fr',
              gap: 14, alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--surface-2)',
              fontSize: 11.5,
            }}>
              <Swatch hex={t.hex} />
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream)', fontSize: 11 }}>{t.name}</code>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', fontSize: 11 }}>{t.hex}</code>
              <span style={{ color: 'var(--fg-muted)', letterSpacing: '-0.05px' }}>{t.use}</span>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock title="Tipografia">
        <div style={{
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 10, padding: 14, marginBottom: 10,
          fontSize: 11, color: 'var(--fg-muted)',
        }}>
          <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream)' }}>
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif
          </code>
        </div>
        <div style={{ display: 'grid', gap: 1, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {TYPE_TOKENS.map(t => (
            <div key={t.label} style={{
              display: 'grid', gridTemplateColumns: '140px 220px 1fr',
              gap: 14, alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--surface-2)',
              fontSize: 11.5,
            }}>
              <span style={{ color: 'var(--cream)', fontWeight: 500 }}>{t.label}</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', fontSize: 10.5 }}>{t.spec}</code>
              <span style={{ color: 'var(--cream)', letterSpacing: '-0.1px' }}>{t.sample}</span>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock title="Espaçamento e radii">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          background: 'var(--border)', borderRadius: 10, overflow: 'hidden',
        }}>
          {SPACE_TOKENS.map(t => (
            <div key={t.tok} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--surface-2)',
              fontSize: 11.5,
            }}>
              <span style={{ color: 'var(--cream)' }}>{t.tok}</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{t.val}</code>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock title="Motion">
        <div style={{ display: 'grid', gap: 1, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {MOTION_TOKENS.map(t => (
            <div key={t.name} style={{
              display: 'grid', gridTemplateColumns: '180px 1fr',
              gap: 14, padding: '10px 14px',
              background: 'var(--surface-2)',
              fontSize: 11.5,
            }}>
              <span style={{ color: 'var(--cream)' }}>{t.name}</span>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', fontSize: 10.5, lineHeight: 1.5 }}>{t.spec}</code>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock title="Estados de painel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'processando', body: <ProcessingDots phase={0} /> },
            { label: 'streaming',   body: (
              <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.65 }}>
                As redes operam por captura institucional<span className="hl-caret" />
              </p>
            ) },
            { label: 'concluído',   body: (
              <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.65 }}>
                Democracia é uma ficção útil. O que existe são oligarquias com eleições periódicas.
              </p>
            ) },
          ].map(s => (
            <div key={s.label} className="paper" style={{
              background: 'var(--cream)', borderRadius: 12,
              padding: '13px 15px', minHeight: 130,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: s.label === 'processando' ? 16 : 9,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Dot size={5} color="var(--ink)" />
                  <span style={{
                    fontSize: 10, fontWeight: 500, color: 'var(--ink-2)',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>Modelo</span>
                </div>
                {s.label !== 'processando' && (
                  <span style={{
                    fontSize: 9, color: s.label === 'concluído' ? '#7A8A6A' : 'var(--fg-muted)',
                    letterSpacing: '0.2px',
                  }}>{s.label}</span>
                )}
              </div>
              {s.body}
            </div>
          ))}
        </div>
      </SpecBlock>
    </div>
  );
}

Object.assign(window, { SpecsView });
