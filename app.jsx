// ────────────────────────────────────────────────────────────────────────────
// HYDRA LABS — App
// Sidebar + theme toggle + fixed input bar + arena state machine.
// ────────────────────────────────────────────────────────────────────────────

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "arena",
  "theme": "dark",
  "sidebarCollapsed": false,
  "notesOpen": false,
  "scenario": "mixed",
  "showSynthesis": true,
  "density": 8,
  "streamSpeed": 22
}/*EDITMODE-END*/;

function buildScenario(scenario) {
  return MODELS.map((m, i) => {
    const full = RESPONSES[m.id];
    let status = 'processing', text = '';
    if (scenario === 'mixed') {
      if (i === 0) { status = 'streaming'; text = full.slice(0, 96); }
      else if (i === 1) { status = 'done'; text = full; }
    } else if (scenario === 'all-streaming') {
      status = 'streaming';
      text = full.slice(0, Math.floor(full.length * (0.2 + i * 0.05)));
    } else if (scenario === 'all-done') {
      status = 'done'; text = full;
    }
    return { id: m.id, name: m.name, status, text, fullText: full };
  });
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [panels, setPanels] = useState(() => buildScenario(t.scenario));
  const [mode, setMode] = useState('raciocinio');
  const [modeOpen, setModeOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState({ top: 64, left: 32 });
  const [running, setRunning] = useState(false);
  const timersRef = useRef([]);
  const lastScenarioRef = useRef(t.scenario);

  // apply theme to <html data-theme="...">
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme || 'dark');
  }, [t.theme]);

  useEffect(() => {
    if (lastScenarioRef.current !== t.scenario) {
      lastScenarioRef.current = t.scenario;
      stopAllTimers();
      setPanels(buildScenario(t.scenario));
      setRunning(false);
    }
  }, [t.scenario]);

  function stopAllTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function runFreshSimulation(newQuery) {
    stopAllTimers();
    setRunning(true);
    setQuery(newQuery);

    const fresh = MODELS.map(m => ({
      id: m.id, name: m.name, status: 'processing',
      text: '', fullText: RESPONSES[m.id],
    }));
    setPanels(fresh);

    const speed = Math.max(8, t.streamSpeed);
    let allDoneAt = 0;

    fresh.forEach((p, i) => {
      const startStreamAt = 600 + i * 280 + Math.random() * 250;
      timersRef.current.push(setTimeout(() => {
        setPanels(curr => curr.map(c => c.id === p.id ? { ...c, status: 'streaming' } : c));
        const txt = p.fullText;
        const charDelay = speed + (i % 3) * 4;
        for (let k = 1; k <= txt.length; k++) {
          timersRef.current.push(setTimeout(() => {
            setPanels(curr => curr.map(c => c.id === p.id ? { ...c, text: txt.slice(0, k) } : c));
          }, k * charDelay));
        }
        const doneAt = txt.length * charDelay + 200;
        allDoneAt = Math.max(allDoneAt, startStreamAt + doneAt);
        timersRef.current.push(setTimeout(() => {
          setPanels(curr => curr.map(c => c.id === p.id ? { ...c, status: 'done', text: txt } : c));
        }, doneAt));
      }, startStreamAt));
    });

    timersRef.current.push(setTimeout(() => setRunning(false), allDoneAt + 400));
  }

  useEffect(() => () => stopAllTimers(), []);

  const counts = useMemo(() => {
    let processing = 0, done = 0;
    panels.forEach(p => {
      if (p.status === 'done') done++;
      else processing++;
    });
    return { processing, done };
  }, [panels]);

  const allDone = counts.done === panels.length && panels.length > 0;
  const showSynth = t.showSynthesis && allDone;

  function openModePopover(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = document.getElementById('hl-container').getBoundingClientRect();
    setAnchorPos({
      top: rect.bottom - containerRect.top + 8,
      left: rect.left - containerRect.left,
    });
    setModeOpen(true);
  }

  const sidebarW = t.sidebarCollapsed ? 52 : 220;
  const notesW = t.notesOpen ? 280 : 0;
  const [notesText, setNotesText] = useState('Insight: nenhum modelo apresentou contra-mecanismos. Próxima iteração — pedir prescrições.\n\nRever Bourdieu sobre violência simbólica.');
  const navView = t.view === 'specs' ? 'arena' : t.view; // specs is a Tweak-only mode; sidebar nav stays "arena"

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Sidebar
        collapsed={t.sidebarCollapsed}
        onToggleCollapsed={() => setTweak('sidebarCollapsed', !t.sidebarCollapsed)}
        theme={t.theme}
        onToggleTheme={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        view={navView === 'specs' ? 'arena' : navView}
        onView={(v) => setTweak('view', v)}
      />

      <main style={{
        marginLeft: sidebarW,
        marginRight: notesW,
        minHeight: '100vh',
        transition: 'margin-left .2s ease, margin-right .2s ease',
        position: 'relative',
      }}>
        {t.view === 'specs' ? (
          <div style={{ padding: '40px 32px 80px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <SpecsView />
            </div>
          </div>
        ) : t.view === 'library' ? (
          <LibraryView onOpen={() => setTweak('view', 'arena')} />
        ) : t.view === 'config' ? (
          <ConfigView />
        ) : (
          <ArenaView
            t={t}
            mode={mode}
            counts={counts}
            query={query}
            panels={panels}
            running={running}
            showSynth={showSynth}
            onOpenMode={openModePopover}
            onDensity={d => setTweak('density', d)}
            onSubmit={runFreshSimulation}
            modeOpen={modeOpen}
            anchorPos={anchorPos}
            onPickMode={(id) => { setMode(id); setModeOpen(false); }}
            onCloseMode={() => setModeOpen(false)}
          />
        )}
      </main>

      <NotesToggle open={t.notesOpen} onClick={() => setTweak('notesOpen', true)} />
      <NotesPanel
        open={t.notesOpen}
        onClose={() => setTweak('notesOpen', false)}
        value={notesText}
        onChange={setNotesText}
      />

      <HydraTweaks t={t} setTweak={setTweak} onRun={() => runFreshSimulation(query)} />
    </>
  );
}

// ── arena view (header + grid + synthesis + fixed input bar) ────────────────

function ArenaView({
  t, mode, counts, query, panels, running, showSynth,
  onOpenMode, onDensity, onSubmit,
  modeOpen, anchorPos, onPickMode, onCloseMode,
}) {
  return (
    <div
      id="hl-container"
      data-screen-label="01 Arena"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* scrollable content */}
      <div style={{
        flex: 1,
        padding: '24px 24px 0',
        paddingBottom: 180,  /* space for fixed input bar */
        maxWidth: 1180, width: '100%',
        margin: '0 auto',
      }}>
        <Header
          mode={mode}
          onOpenMode={onOpenMode}
          density={t.density}
          onDensity={onDensity}
          counts={counts}
        />
        <QueryBubble query={query} />
        <ArenaGrid panels={panels} density={t.density} />
        <SynthesisPanel visible={showSynth} />
      </div>

      {/* fixed input bar at viewport bottom, offset by sidebar */}
      <div style={{
        position: 'fixed',
        left:  t.sidebarCollapsed ? 52 : 220,
        right: t.notesOpen ? 280 : 0,
        bottom: 0,
        zIndex: 20,
        transition: 'left .2s ease',
        pointerEvents: 'none',
      }}>
        {/* fade gradient for separation */}
        <div className="hl-input-fade" />
        <div style={{
          background: 'var(--surface)',
          padding: '12px 24px 18px',
          pointerEvents: 'auto',
        }}>
          <div style={{ maxWidth: 1132, margin: '0 auto' }}>
            <InputBar
              onSubmit={onSubmit}
              suggestions={SUGGESTIONS}
              busy={running}
            />
          </div>
        </div>
      </div>

      <ModeSelector
        open={modeOpen}
        mode={mode}
        onPick={onPickMode}
        onClose={onCloseMode}
        anchorPos={anchorPos}
      />
    </div>
  );
}

// ── placeholder for Biblioteca / Configuração ───────────────────────────────

function PlaceholderView({ title, subtitle }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px',
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          fontSize: 9, fontWeight: 500, color: 'var(--fg-faint)',
          letterSpacing: '0.6px', textTransform: 'uppercase',
          marginBottom: 12,
        }}>Em construção</div>
        <h1 style={{
          margin: '0 0 8px', fontSize: 32, fontWeight: 500,
          letterSpacing: '-0.6px', color: 'var(--fg)',
        }}>{title}</h1>
        <p style={{
          margin: 0, fontSize: 13, color: 'var(--fg-muted)',
          letterSpacing: '-0.1px', lineHeight: 1.6,
        }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ── tweaks panel ────────────────────────────────────────────────────────────

function HydraTweaks({ t, setTweak, onRun }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Vista" />
      <TweakSelect
        label="Ecrã"
        value={t.view}
        options={[
          { value: 'arena',   label: 'Arena' },
          { value: 'library', label: 'Biblioteca' },
          { value: 'config',  label: 'Configuração' },
          { value: 'specs',   label: 'Specs (handoff)' },
        ]}
        onChange={(v) => setTweak('view', v)}
      />
      <TweakRadio
        label="Tema"
        value={t.theme}
        options={[
          { value: 'dark',  label: 'Escuro' },
          { value: 'light', label: 'Claro' },
        ]}
        onChange={(v) => setTweak('theme', v)}
      />
      <TweakToggle
        label="Sidebar recolhida"
        value={t.sidebarCollapsed}
        onChange={(v) => setTweak('sidebarCollapsed', v)}
      />
      <TweakToggle
        label="Painel de notas"
        value={t.notesOpen}
        onChange={(v) => setTweak('notesOpen', v)}
      />

      {t.view === 'arena' && (
        <>
          <TweakSection label="Estado" />
          <TweakSelect
            label="Cenário"
            value={t.scenario}
            options={[
              { value: 'mixed',          label: 'Misto (1 stream · 1 done)' },
              { value: 'all-processing', label: '8 a processar' },
              { value: 'all-streaming',  label: '8 em streaming' },
              { value: 'all-done',       label: '8 concluídas + síntese' },
            ]}
            onChange={(v) => setTweak('scenario', v)}
          />
          <TweakToggle
            label="Mostrar síntese"
            value={t.showSynthesis}
            onChange={(v) => setTweak('showSynthesis', v)}
          />
          {onRun && (
            <TweakButton label="Correr simulação completa" onClick={onRun} />
          )}

          <TweakSection label="Layout" />
          <TweakRadio
            label="Densidade"
            value={t.density}
            options={[
              { value: 2, label: '2×' },
              { value: 4, label: '4×' },
              { value: 8, label: '8×' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />

          <TweakSection label="Velocidade" />
          <TweakSlider
            label="ms por caractere"
            value={t.streamSpeed}
            min={6} max={60} step={2} unit="ms"
            onChange={(v) => setTweak('streamSpeed', v)}
          />
        </>
      )}
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
