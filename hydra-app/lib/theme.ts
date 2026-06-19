// Tema personalizável (acento, tipografia, densidade) — persistido em
// localStorage `hydra_theme` e aplicado via CSS variables no <html>.

export type Density = 'compacto' | 'normal' | 'espacoso';

export interface ThemeCfg {
  accent: string;
  pairing: string;
  fontUi: string;
  fontRead: string;
  density: Density;
}

const SANS     = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const SERIF    = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const MONO     = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const HUMANIST = "'Segoe UI', Roboto, system-ui, 'Helvetica Neue', sans-serif";

/** Acentos curados (matizes contidas e harmoniosas) + hex personalizado. */
export const ACCENT_SWATCHES = [
  '#7A9A6A', '#C28E5E', '#7C93C9', '#A87FB0',
  '#6E78B8', '#5FA39A', '#C0705A', '#8893A8',
];

export interface FontPairing {
  id: string;
  label: string;
  hint: string;
  ui: string;
  read: string;
  /** Tipo usado para pré-visualizar a etiqueta. */
  sample: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  { id: 'sistema',   label: 'Sistema',   hint: 'sans · sans',  ui: SANS,     read: SANS,  sample: SANS     },
  { id: 'editorial', label: 'Editorial', hint: 'sans · serif', ui: SANS,     read: SERIF, sample: SERIF    },
  { id: 'tecnico',   label: 'Técnico',   hint: 'sans · mono',  ui: SANS,     read: MONO,  sample: MONO     },
  { id: 'humanista', label: 'Humanista', hint: 'humanista',    ui: HUMANIST, read: SERIF, sample: HUMANIST },
];

export const DENSITIES: { id: Density; label: string }[] = [
  { id: 'compacto', label: 'Compacto' },
  { id: 'normal',   label: 'Normal'   },
  { id: 'espacoso', label: 'Espaçoso' },
];

export const DEFAULT_THEME: ThemeCfg = {
  accent: '#7A9A6A',
  pairing: 'sistema',
  fontUi: SANS,
  fontRead: SANS,
  density: 'normal',
};

export const THEME_KEY = 'hydra_theme';

export function readTheme(): ThemeCfg {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return { ...DEFAULT_THEME };
    return { ...DEFAULT_THEME, ...(JSON.parse(raw) as Partial<ThemeCfg>) };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

export function applyTheme(t: ThemeCfg) {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.style.setProperty('--accent', t.accent);
  r.style.setProperty('--font-ui', t.fontUi);
  r.style.setProperty('--font-read', t.fontRead);
  r.setAttribute('data-density', t.density);
}

export function writeTheme(t: ThemeCfg) {
  try { localStorage.setItem(THEME_KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

/** Densidade → densidade inicial da grelha da arena. */
export function densityToGrid(d: Density): 2 | 3 | 6 {
  return d === 'compacto' ? 6 : d === 'espacoso' ? 2 : 3;
}
