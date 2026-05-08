// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — components
// Header · QueryBubble · Panel (3 states) · InputBar · ModeSelector · Synthesis
// ────────────────────────────────────────────────────────────────────────────

const { useState, useEffect, useRef, useMemo } = React;

// ── small bits ──────────────────────────────────────────────────────────────

function Dot({ size = 5, color = 'var(--ink)' }) {
  return <span style={{
    width: size, height: size, borderRadius: '50%',
    background: color, display: 'inline-block', flexShrink: 0,
  }} />;
}

function ProcessingDots({ phase = 0 }) {
  // phase shifts the start so different panels don't pulse in unison
  const base = phase * 0.04;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 12 }}>
      <span className="hl-dot" style={{ animationDelay: `${base}s` }} />
      <span className="hl-dot" style={{ animationDelay: `${base + 0.18}s` }} />
      <span className="hl-dot" style={{ animationDelay: `${base + 0.36}s` }} />
    </div>
  );
}

// ── header ──────────────────────────────────────────────────────────────────

function Header({ mode, onOpenMode, density, onDensity, counts }) {
  const modeObj = MODES.find(m => m.id === mode) || MODES[1];
  const modeBadge = modeObj.label.toUpperCase();
  const densities = [2, 4, 8];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px', marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          color: 'var(--cream)', fontSize: 17, fontWeight: 500,
          letterSpacing: '-0.5px',
        }}>
          Hydra Labs
        </span>
        <button
          onClick={onOpenMode}
          className="hl-iconbtn"
          style={{
            background: 'var(--surface-3)', color: 'var(--fg-muted)',
            fontSize: 10, fontWeight: 500, padding: '4px 10px',
            borderRadius: 20, letterSpacing: '0.5px',
            border: '0.5px solid var(--border)', cursor: 'pointer',
          }}
        >
          {modeBadge}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{
          color: 'var(--fg-faint)', fontSize: 10, letterSpacing: '0.2px',
          marginRight: 8,
        }}>
          {counts.processing > 0
            ? `${counts.processing} processando · ${counts.done} concluídas`
            : `${counts.done} concluídas`}
        </span>
        {densities.map(d => {
          const active = d === density;
          return (
            <button
              key={d}
              className={`hl-density ${active ? 'is-active' : ''}`}
              onClick={() => onDensity(d)}
              style={{
                background: active ? 'var(--cream)' : 'var(--surface-3)',
                color: active ? 'var(--ink)' : 'var(--fg-muted)',
                border: active ? 'none' : '0.5px solid var(--border)',
                fontSize: 11, fontWeight: 500,
                padding: '4px 11px', borderRadius: 6,
                cursor: 'pointer', letterSpacing: '-0.1px',
              }}
            >
              {d}×
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── current query bubble ────────────────────────────────────────────────────

function QueryBubble({ query }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '0.5px solid var(--border)',
      borderRadius: 10,
      padding: '11px 16px',
      marginBottom: 14,
    }}>
      <p style={{
        color: 'var(--fg-quote)', fontSize: 13, margin: 0,
        lineHeight: 1.5, letterSpacing: '-0.1px',
      }}>
        "{query}"
      </p>
    </div>
  );
}

// ── single response panel ───────────────────────────────────────────────────

function Panel({ data, index, density }) {
  const { name, status, text } = data;
  const statusColor = status === 'done' ? '#7A8A6A' : 'var(--fg-muted)';
  const isProcessing = status === 'processing';
  const isStreaming  = status === 'streaming';
  const isDone       = status === 'done';

  // Adapt min-height by density so 8× stays compact
  const minH = density === 8 ? 116 : density === 4 ? 150 : 180;
  const maxH = density === 8 ? 170 : density === 4 ? 240 : 320;

  return (
    <div
      className="hl-panel-anim paper"
      style={{
        background: 'var(--cream)',
        borderRadius: 'var(--r-panel)',
        padding: '13px 15px',
        minHeight: minH,
        maxHeight: maxH,
        display: 'flex', flexDirection: 'column',
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: isProcessing ? 16 : 9,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Dot size={5} color="var(--ink)" />
          <span style={{
            fontSize: 10, fontWeight: 500, color: 'var(--ink-2)',
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            {name}
          </span>
        </div>
        {!isProcessing && (
          <span style={{
            fontSize: 9, color: statusColor, letterSpacing: '0.2px',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {/* body */}
      {isProcessing ? (
        <ProcessingDots phase={index} />
      ) : (
        <p
          className="scroll-paper"
          style={{
            fontSize: 12, color: 'var(--ink-2)',
            lineHeight: 1.65, margin: 0, letterSpacing: '-0.1px',
            flex: 1,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {text}
          {isStreaming && <span className="hl-caret" />}
        </p>
      )}

      {/* footer */}
      {isDone && (
        <div style={{
          display: 'flex', gap: 12,
          borderTop: '0.5px solid var(--cream-2)',
          paddingTop: 8, marginTop: 9,
        }}>
          {['copiar', 'repetir', 'baixar'].map(a => (
            <span
              key={a}
              className="hl-footaction"
              style={{
                fontSize: 10, color: 'var(--fg-muted)',
                cursor: 'pointer', letterSpacing: '0.1px',
              }}
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── grid of 8 panels ────────────────────────────────────────────────────────

function ArenaGrid({ panels, density }) {
  // density 2: 1 col, 4: 2 cols, 8: 2 cols (spec says "Grid 2 colunas × 4 linhas")
  // We'll use density only to control the visible count + sizing.
  // Always 2 columns.
  const visible = panels.slice(0, density);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: density === 2 ? '1fr 1fr' : '1fr 1fr',
      gap: 8,
      marginBottom: 14,
    }}>
      {visible.map((p, i) => (
        <Panel key={p.id} data={p} index={i} density={density} />
      ))}
    </div>
  );
}

// ── input bar ───────────────────────────────────────────────────────────────

function InputBar({ onSubmit, suggestions, busy }) {
  const [val, setVal] = useState('');
  const taRef = useRef(null);

  const submit = () => {
    const q = val.trim();
    if (!q || busy) return;
    onSubmit(q);
    setVal('');
  };

  const useSuggestion = (s) => {
    setVal(prev => prev ? `${prev} · ${s}` : s);
    taRef.current?.focus();
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 'var(--r-input)',
      padding: '12px 14px',
      border: '0.5px solid var(--border)',
    }}>
      <div style={{
        display: 'flex', gap: 7, marginBottom: 11, flexWrap: 'wrap',
      }}>
        {suggestions.map(s => (
          <button
            key={s}
            className="hl-chip"
            onClick={() => useSuggestion(s)}
            style={{
              background: 'var(--surface-3)',
              border: '0.5px solid var(--border)',
              color: '#8A8480', fontSize: 11, fontWeight: 400,
              padding: '5px 12px',
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              letterSpacing: '-0.05px',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{
          color: 'var(--fg-faint)', fontSize: 13,
          fontWeight: 300, userSelect: 'none',
        }}>
          ›
        </span>
        <input
          ref={taRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={onKey}
          placeholder="Faz a tua pergunta às 8 inteligências…"
          style={{
            flex: 1,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--cream)', fontSize: 13,
            letterSpacing: '-0.1px',
          }}
        />
        <button
          className="hl-send"
          onClick={submit}
          disabled={busy || !val.trim()}
          style={{
            background: busy || !val.trim() ? 'var(--surface-3)' : 'var(--cream)',
            color:      busy || !val.trim() ? 'var(--fg-muted)'  : 'var(--ink)',
            border: 'none',
            fontSize: 12, fontWeight: 500,
            padding: '7px 16px',
            borderRadius: 'var(--r-btn)',
            cursor: busy || !val.trim() ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.1px',
          }}
        >
          {busy ? 'A correr…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

// ── mode selector popover ───────────────────────────────────────────────────

function ModeSelector({ open, mode, onPick, onClose, anchorPos }) {
  if (!open) return null;
  return (
    <>
      <div
        className="hl-overlay"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(12,11,9,.55)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        className="hl-pop-anim"
        style={{
          position: 'absolute',
          top: anchorPos.top, left: anchorPos.left,
          zIndex: 91,
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 12,
          width: 320,
          padding: 6,
        }}
      >
        <div style={{
          padding: '8px 10px 6px',
          fontSize: 9, color: 'var(--fg-faint)',
          letterSpacing: '0.6px', textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Modo de execução
        </div>
        {MODES.map(m => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="hl-iconbtn"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: active ? 'var(--cream)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--cream)',
                border: 'none',
                padding: '9px 10px', borderRadius: 8,
                cursor: 'pointer', marginBottom: 1,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: 3,
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 500, letterSpacing: '-0.2px',
                }}>{m.label}</span>
                <span style={{
                  fontSize: 9, color: active ? 'var(--ink-2)' : 'var(--fg-muted)',
                  letterSpacing: '0.4px', textTransform: 'uppercase',
                }}>{m.hint}</span>
              </div>
              <div style={{
                fontSize: 11, color: active ? 'var(--ink-2)' : 'var(--fg-muted)',
                letterSpacing: '-0.05px', lineHeight: 1.4,
              }}>
                {m.desc}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── synthesis panel ─────────────────────────────────────────────────────────

function SynthesisPanel({ visible }) {
  if (!visible) return null;
  return (
    <div
      className="hl-synth-anim paper"
      style={{
        background: 'var(--cream)',
        borderRadius: 'var(--r-panel)',
        padding: '20px 22px 16px',
        marginBottom: 14,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dot size={6} color="var(--ink)" />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.4px' }}>
            Síntese
          </span>
          <span style={{
            fontSize: 9, color: 'var(--ink-2)',
            letterSpacing: '0.5px', textTransform: 'uppercase',
            background: 'var(--cream-2)', padding: '3px 8px',
            borderRadius: 20, fontWeight: 500,
          }}>
            gerado por Claude
          </span>
        </div>
        <span style={{
          fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.4px',
          textTransform: 'uppercase', fontWeight: 500, opacity: .55,
        }}>
          1.2s · 8/8 fontes
        </span>
      </div>

      {/* 3 labeled blocks */}
      <div>
        {SYNTH_BLOCKS.map((b, i) => (
          <div key={b.label} style={{
            display: 'grid', gridTemplateColumns: '110px 1fr', gap: 20,
            padding: '14px 0',
            borderTop: i === 0 ? 'none' : '0.5px solid var(--cream-2)',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 500, color: 'var(--ink-2)',
              opacity: .55,
              letterSpacing: '0.6px', textTransform: 'uppercase',
              paddingTop: 3,
            }}>{b.label}</div>
            <p style={{
              margin: 0, fontSize: 13.5, lineHeight: 1.7,
              color: 'var(--ink-2)', letterSpacing: '-0.15px',
            }}>{b.body}</p>
          </div>
        ))}
      </div>

      {/* footer */}
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center',
        borderTop: '0.5px solid var(--cream-2)',
        paddingTop: 14, marginTop: 6,
      }}>
        <span style={{
          fontSize: 10, color: 'var(--ink-2)', opacity: .55,
          letterSpacing: '0.4px', textTransform: 'uppercase',
          fontWeight: 500,
        }}>Exportar</span>
        {['MD', 'EPUB', 'JSON'].map(fmt => (
          <span
            key={fmt}
            className="hl-footaction"
            style={{
              fontSize: 11, fontWeight: 500,
              color: 'var(--ink-2)', cursor: 'pointer',
              letterSpacing: '0.2px',
            }}
          >
            {fmt}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }} />
        <button
          className="hl-send"
          style={{
            background: 'var(--cream)',
            color: 'var(--ink)',
            border: '0.5px solid var(--ink-2)',
            fontSize: 12, fontWeight: 500,
            padding: '7px 16px',
            borderRadius: 'var(--r-btn)',
            cursor: 'pointer', letterSpacing: '-0.1px',
          }}
        >
          Guardar sessão
        </button>
      </div>
    </div>
  );
}

// ── notes panel (right rail, retractable, pushes content) ───────────────────

function NotesToggle({ open, onClick }) {
  if (open) return null;
  return (
    <button
      onClick={onClick}
      title="Notas"
      style={{
        position: 'fixed', right: 18, top: 18,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--surface-2)',
        border: '0.5px solid var(--border)',
        color: 'var(--fg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 25,
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--fg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <rect x="2.5" y="2" width="9" height="10" rx="1" />
        <line x1="4.5" y1="5"   x2="9.5" y2="5" />
        <line x1="4.5" y1="7.2" x2="9.5" y2="7.2" />
        <line x1="4.5" y1="9.4" x2="7.5" y2="9.4" />
      </svg>
    </button>
  );
}

function NotesPanel({ open, onClose, value, onChange }) {
  return (
    <aside
      className="hl-notes"
      style={{
        position: 'fixed', top: 0, bottom: 0, right: 0,
        width: open ? 280 : 0,
        background: 'var(--surface-2)',
        borderLeft: open ? '0.5px solid var(--border)' : 'none',
        transition: 'width .2s ease',
        overflow: 'hidden',
        zIndex: 28,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 14px 10px',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 500, color: 'var(--fg)',
            letterSpacing: '-0.3px',
          }}>Notas</span>
          <button
            onClick={onClose}
            className="hl-iconbtn"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--fg-muted)', cursor: 'pointer',
              width: 24, height: 24, borderRadius: 6,
              fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escreve aqui…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: 'var(--fg)',
            fontFamily: 'var(--font)',
            fontSize: 12, lineHeight: 1.7,
            padding: '14px 16px',
            letterSpacing: '-0.1px',
          }}
        />
        <div style={{
          padding: '10px 16px',
          borderTop: '0.5px solid var(--border)',
          fontSize: 10, color: 'var(--fg-faint)',
          letterSpacing: '0.1px',
        }}>
          Guardado automaticamente
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, {
  Dot, ProcessingDots, Header, QueryBubble, Panel, ArenaGrid,
  InputBar, ModeSelector, SynthesisPanel, NotesPanel, NotesToggle,
});


// ─── from sidebar.jsx (merged to avoid load issue) ───
// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — Sidebar (left rail)
// 220px expanded · 52px collapsed · nav + history + footer
// ────────────────────────────────────────────────────────────────────────────

// Inline icons. 16x16, currentColor, stroke-based.
const Icon = {
  arena: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2"  y="2"  width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="9"  y="2"  width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="2"  y="9"  width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="9"  y="9"  width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  library: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2.5" y="3"  width="11" height="2.2" rx=".5" stroke="currentColor" strokeWidth="1" />
      <rect x="2.5" y="6.7" width="11" height="2.2" rx=".5" stroke="currentColor" strokeWidth="1" />
      <rect x="2.5" y="10.4" width="11" height="2.2" rx=".5" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  config: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <line x1="2.5" y1="4"  x2="13.5" y2="4" />
      <circle cx="10" cy="4" r="1.5" fill="var(--surface)" />
      <line x1="2.5" y1="8"  x2="13.5" y2="8" />
      <circle cx="5"  cy="8" r="1.5" fill="var(--surface)" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" />
      <circle cx="11" cy="12" r="1.5" fill="var(--surface)" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.8" />
      <line x1="8" y1="1.5" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="14.5" y2="8" />
      <line x1="3.3" y1="3.3" x2="4.3" y2="4.3" />
      <line x1="11.7" y1="11.7" x2="12.7" y2="12.7" />
      <line x1="3.3" y1="12.7" x2="4.3" y2="11.7" />
      <line x1="11.7" y1="4.3" x2="12.7" y2="3.3" />
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
      <path d="M13 9.5 A5.5 5.5 0 0 1 6.5 3 A5.5 5.5 0 1 0 13 9.5 Z" />
    </svg>
  ),
  chevronLeft: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8.5,3.5 5,7 8.5,10.5" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5.5,3.5 9,7 5.5,10.5" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <line x1="7" y1="2.5" x2="7" y2="11.5" />
      <line x1="2.5" y1="7" x2="11.5" y2="7" />
    </svg>
  ),
};

const HISTORY = [
  { group: 'Hoje', items: [
    { title: 'Redes de influência democrática', mode: '/Raciocínio', voices: 8, active: true },
    { title: 'Teoria dos jogos aplicada',       mode: '/Investigação', voices: 8 },
  ]},
  { group: 'Ontem', items: [
    { title: 'Psicologia da manipulação',  mode: '/Pesquisa',   voices: 4 },
    { title: 'Sistemas complexos e caos',  mode: '/Raciocínio', voices: 8 },
  ]},
  { group: 'Esta semana', items: [
    { title: 'Filosofia da mente e consciência', mode: '/Raciocínio', voices: 8 },
    { title: 'Geopolítica do Indo-Pacífico',     mode: '/Pesquisa',   voices: 8 },
  ]},
];

function NavItem({ icon, label, active, collapsed, onClick }) {
  return (
    <button
      className={`hl-navitem ${active ? 'is-active' : ''}`}
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%',
        padding: collapsed ? '0' : '0 10px',
        height: 34,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'var(--cream)' : 'transparent',
        color:      active ? 'var(--ink)'   : 'var(--fg-muted)',
        border: 'none', borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12, fontWeight: 500, letterSpacing: '-0.1px',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </button>
  );
}

function HistItem({ item }) {
  return (
    <button
      className="hl-histitem"
      style={{
        display: 'block', width: '100%',
        background: item.active ? 'var(--surface-3)' : 'transparent',
        border: 'none', borderRadius: 6,
        padding: '7px 9px',
        textAlign: 'left', cursor: 'pointer',
        marginBottom: 1,
      }}
    >
      <div style={{
        fontSize: 12, color: 'var(--fg)', fontWeight: 400,
        letterSpacing: '-0.2px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        marginBottom: 2,
      }}>{item.title}</div>
      <div style={{
        fontSize: 10, color: 'var(--fg-faint)',
        letterSpacing: '0.1px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{item.mode} · {item.voices} vozes</div>
    </button>
  );
}

function FooterButton({ icon, label, collapsed, onClick }) {
  return (
    <button
      className="hl-navitem"
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%',
        padding: collapsed ? '0' : '0 10px',
        height: 32,
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: 'transparent',
        color: 'var(--fg-muted)',
        border: 'none', borderRadius: 8,
        cursor: 'pointer',
        fontSize: 11, fontWeight: 500, letterSpacing: '-0.05px',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
    </button>
  );
}

function Sidebar({ collapsed, onToggleCollapsed, theme, onToggleTheme, view, onView }) {
  const w = collapsed ? 52 : 220;
  return (
    <aside
      className="hl-sidebar"
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: w,
        background: 'var(--surface-2)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        zIndex: 30,
        padding: '14px 8px 12px',
      }}
    >
      {/* brand mark */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 28, padding: collapsed ? 0 : '0 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        marginBottom: 14,
      }}>
        <div style={{
          width: 16, height: 16, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--fg)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            border: '0.5px solid var(--fg-muted)',
            borderRadius: '50%', opacity: .4,
          }} />
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 13, fontWeight: 500, color: 'var(--fg)',
            letterSpacing: '-0.4px',
          }}>Hydra Labs</span>
        )}
      </div>

      {/* nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
        <NavItem icon={Icon.arena}   label="Arena"        active={view === 'arena'}   collapsed={collapsed} onClick={() => onView('arena')} />
        <NavItem icon={Icon.library} label="Biblioteca"   active={view === 'library'} collapsed={collapsed} onClick={() => onView('library')} />
        <NavItem icon={Icon.config}  label="Configuração" active={view === 'config'}  collapsed={collapsed} onClick={() => onView('config')} />
      </nav>

      {/* divider */}
      <div style={{
        height: '0.5px', background: 'var(--border)',
        margin: '0 4px 12px',
      }} />

      {/* new session / history label row */}
      {!collapsed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px', marginBottom: 8,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 500, color: 'var(--fg-faint)',
            letterSpacing: '0.6px', textTransform: 'uppercase',
          }}>Sessões</span>
          <button
            className="hl-iconbtn"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--fg-muted)', cursor: 'pointer',
              padding: 4, borderRadius: 4,
              display: 'inline-flex',
            }}
            title="Nova sessão"
          >
            {Icon.plus}
          </button>
        </div>
      )}

      {/* history scroll */}
      {!collapsed && (
        <div className="scroll" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 4px',
          minHeight: 0,
        }}>
          {HISTORY.map(group => (
            <div key={group.group} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 9, fontWeight: 500, color: 'var(--fg-faint)',
                letterSpacing: '0.6px', textTransform: 'uppercase',
                padding: '0 5px', marginBottom: 4,
              }}>{group.group}</div>
              {group.items.map((it, i) => (
                <HistItem key={i} item={it} />
              ))}
            </div>
          ))}
        </div>
      )}
      {collapsed && <div style={{ flex: 1 }} />}

      {/* footer */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        paddingTop: 8, marginTop: 8,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <FooterButton
          icon={theme === 'dark' ? Icon.sun : Icon.moon}
          label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          collapsed={collapsed}
          onClick={onToggleTheme}
        />
        <FooterButton
          icon={collapsed ? Icon.chevronRight : Icon.chevronLeft}
          label="Recolher"
          collapsed={collapsed}
          onClick={onToggleCollapsed}
        />
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
