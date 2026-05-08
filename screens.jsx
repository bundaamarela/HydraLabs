// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — Library + Config screens
// ────────────────────────────────────────────────────────────────────────────

function ScreenHead({ label, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 9, fontWeight: 500, color: 'var(--fg-faint)',
        letterSpacing: '0.6px', textTransform: 'uppercase',
        marginBottom: 12,
      }}>{label}</div>
      <h1 style={{
        margin: '0 0 8px', fontSize: 28, fontWeight: 500,
        letterSpacing: '-0.6px', color: 'var(--fg)',
      }}>{title}</h1>
      <p style={{
        margin: 0, fontSize: 13, color: 'var(--fg-muted)',
        letterSpacing: '-0.1px', lineHeight: 1.6,
      }}>{subtitle}</p>
    </div>
  );
}

// ── BIBLIOTECA ──────────────────────────────────────────────────────────────

function LibraryView({ onOpen }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = LIBRARY_SESSIONS.filter(s => {
    if (filter !== 'all' && s.mode !== filter) return false;
    if (q && !(`${s.title} ${s.preview}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const filters = ['all', '/Rápido', '/Raciocínio', '/Pesquisa', '/Investigação'];

  return (
    <div data-screen-label="02 Biblioteca" style={{ minHeight: '100vh', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <ScreenHead
          label="Biblioteca"
          title="Sessões"
          subtitle={`${LIBRARY_SESSIONS.length} conversas guardadas — pesquisa, filtra por modo, ou abre para continuar.`}
        />

        {/* search + filters */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 18, flexWrap: 'wrap',
        }}>
          <div style={{
            flex: '1 1 280px',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--fg-faint)" strokeWidth="1">
              <circle cx="5" cy="5" r="3.2" />
              <line x1="7.5" y1="7.5" x2="10" y2="10" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar sessões…"
              style={{
                flex: 1,
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--fg)', fontFamily: 'var(--font)',
                fontSize: 12.5, letterSpacing: '-0.1px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {filters.map(f => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: active ? 'var(--cream)' : 'var(--surface-2)',
                    color: active ? 'var(--ink)' : 'var(--fg-muted)',
                    border: '0.5px solid var(--border)',
                    borderColor: active ? 'transparent' : 'var(--border)',
                    fontSize: 10.5, fontWeight: 500,
                    padding: '6px 11px', borderRadius: 18,
                    fontFamily: 'var(--font)', cursor: 'pointer',
                    letterSpacing: '0.1px',
                  }}
                >
                  {f === 'all' ? 'Todos' : f}
                </button>
              );
            })}
          </div>
        </div>

        {/* list */}
        <div style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              fontSize: 12, color: 'var(--fg-faint)',
            }}>Sem resultados.</div>
          ) : filtered.map((s, i) => (
            <div
              key={i}
              onClick={() => onOpen && onOpen(s)}
              className="hl-libitem"
              style={{
                padding: '16px 18px',
                borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
                cursor: 'pointer',
                transition: 'background .12s',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 12,
                alignItems: 'start',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--fg)',
                  letterSpacing: '-0.3px', marginBottom: 4,
                }}>{s.title}</div>
                <div style={{
                  fontSize: 11.5, color: 'var(--fg-muted)',
                  letterSpacing: '-0.1px', lineHeight: 1.55,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{s.preview}</div>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-end', gap: 6,
                fontSize: 9, fontWeight: 500,
                letterSpacing: '0.4px', textTransform: 'uppercase',
              }}>
                <span style={{ color: 'var(--fg-faint)' }}>{s.when}</span>
                <span style={{ color: 'var(--fg-muted)' }}>{s.mode} · {s.voices} vozes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CONFIGURAÇÃO ────────────────────────────────────────────────────────────

function ConfigSection({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        margin: '0 0 12px', fontSize: 9, fontWeight: 500,
        color: 'var(--fg-faint)', letterSpacing: '0.6px',
        textTransform: 'uppercase',
      }}>{title}</h2>
      <div style={{
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </section>
  );
}

function ConfigRow({ label, hint, children, last }) {
  return (
    <div style={{
      padding: '14px 18px',
      borderTop: last ? 'none' : undefined,
      borderBottom: last ? 'none' : '0.5px solid var(--border)',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 16, alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: 'var(--fg)',
          letterSpacing: '-0.2px', marginBottom: hint ? 3 : 0,
        }}>{label}</div>
        {hint && <div style={{
          fontSize: 11, color: 'var(--fg-muted)',
          letterSpacing: '-0.1px', lineHeight: 1.5,
        }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ApiKeyField({ provider, status }) {
  const [val, setVal] = useState('');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <input
        type="password"
        placeholder={status === 'connected' ? '••••••••••••••••' : 'sk-…'}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{
          background: 'var(--surface-3)',
          border: '0.5px solid var(--border)',
          borderRadius: 8,
          padding: '7px 12px',
          color: 'var(--fg)',
          fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
          fontSize: 11.5, outline: 'none',
          width: 200,
        }}
      />
      <span style={{
        fontSize: 9, fontWeight: 500,
        letterSpacing: '0.5px', textTransform: 'uppercase',
        color: status === 'connected' ? 'var(--fg)' : 'var(--fg-faint)',
        opacity: status === 'connected' ? 1 : 0.6,
        whiteSpace: 'nowrap',
      }}>
        {status === 'connected' ? '● ligado' : '○ por ligar'}
      </span>
    </div>
  );
}

function ConfigToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 12,
        background: value ? 'var(--cream)' : 'var(--surface-3)',
        border: '0.5px solid var(--border)',
        position: 'relative', cursor: 'pointer',
        padding: 0, transition: 'background .15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: value ? 18 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: value ? 'var(--ink)' : 'var(--fg-muted)',
        transition: 'left .15s, background .15s',
      }} />
    </button>
  );
}

function ConfigSelect({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'var(--surface-3)',
        border: '0.5px solid var(--border)',
        borderRadius: 8,
        padding: '6px 10px',
        color: 'var(--fg)',
        fontFamily: 'var(--font)',
        fontSize: 11.5, outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ConfigView() {
  const [defaultMode, setDefaultMode] = useState('/Raciocínio');
  const [autoSynth, setAutoSynth] = useState(true);
  const [streamHaptics, setStreamHaptics] = useState(false);
  const [language, setLanguage] = useState('Português');
  const [synthesizer, setSynthesizer] = useState('Claude');

  const providers = [
    { name: 'Anthropic',  status: 'connected' },
    { name: 'OpenAI',     status: 'connected' },
    { name: 'xAI',        status: 'connected' },
    { name: 'Google',     status: 'connected' },
    { name: 'Perplexity', status: 'connected' },
    { name: 'DeepSeek',   status: 'pending' },
    { name: 'Mistral',    status: 'connected' },
    { name: 'Cohere',     status: 'pending' },
  ];

  return (
    <div data-screen-label="03 Configuração" style={{ minHeight: '100vh', padding: '40px 32px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <ScreenHead
          label="Configuração"
          title="Preferências"
          subtitle="Chaves de API, comportamento por defeito e atalhos."
        />

        <ConfigSection title="Vozes">
          {providers.map((p, i) => (
            <ConfigRow
              key={p.name}
              label={p.name}
              last={i === providers.length - 1}
            >
              <ApiKeyField provider={p.name} status={p.status} />
            </ConfigRow>
          ))}
        </ConfigSection>

        <ConfigSection title="Comportamento">
          <ConfigRow label="Modo por defeito" hint="Aplicado a cada nova arena.">
            <ConfigSelect
              value={defaultMode}
              options={['/Rápido', '/Raciocínio', '/Pesquisa', '/Investigação']}
              onChange={setDefaultMode}
            />
          </ConfigRow>
          <ConfigRow label="Síntese automática" hint="Gera síntese assim que as 8 vozes concluem.">
            <ConfigToggle value={autoSynth} onChange={setAutoSynth} />
          </ConfigRow>
          <ConfigRow label="Sintetizador" hint="Voz responsável por unificar respostas." last>
            <ConfigSelect
              value={synthesizer}
              options={['Claude', 'Grok', 'ChatGPT', 'Gemini']}
              onChange={setSynthesizer}
            />
          </ConfigRow>
        </ConfigSection>

        <ConfigSection title="Interface">
          <ConfigRow label="Idioma" hint="Aplica-se a UI e prompts internos.">
            <ConfigSelect
              value={language}
              options={['Português', 'English', 'Español', 'Français']}
              onChange={setLanguage}
            />
          </ConfigRow>
          <ConfigRow label="Vibração no streaming" hint="Feedback subtil em dispositivos com háptica." last>
            <ConfigToggle value={streamHaptics} onChange={setStreamHaptics} />
          </ConfigRow>
        </ConfigSection>

        <ConfigSection title="Atalhos">
          <ConfigRow label="Nova arena"  last={false}><kbd className="hl-kbd">⌘ N</kbd></ConfigRow>
          <ConfigRow label="Focar input"          ><kbd className="hl-kbd">/</kbd></ConfigRow>
          <ConfigRow label="Mudar de modo"        ><kbd className="hl-kbd">⌘ K</kbd></ConfigRow>
          <ConfigRow label="Abrir notas"          ><kbd className="hl-kbd">⌘ ⇧ N</kbd></ConfigRow>
          <ConfigRow label="Recolher sidebar" last><kbd className="hl-kbd">⌘ \</kbd></ConfigRow>
        </ConfigSection>
      </div>
    </div>
  );
}

Object.assign(window, { LibraryView, ConfigView });
