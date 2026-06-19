'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/app/providers';

// ── icons ────────────────────────────────────────────────────────────────────

function IconArena() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2.5" y="3"    width="11" height="2" rx=".5" />
      <rect x="2.5" y="7"    width="11" height="2" rx=".5" />
      <rect x="2.5" y="11"   width="11" height="2" rx=".5" />
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <line x1="2" y1="6"  x2="14" y2="6" />
      <line x1="6" y1="6"  x2="6"  y2="14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <line x1="2.5" y1="4"  x2="13.5" y2="4" />
      <circle cx="10" cy="4"  r="1.5" fill="var(--surface-2)" />
      <line x1="2.5" y1="8"  x2="13.5" y2="8" />
      <circle cx="5"  cy="8"  r="1.5" fill="var(--surface-2)" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" />
      <circle cx="11" cy="12" r="1.5" fill="var(--surface-2)" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6Z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.4" />
      <line x1="7" y1="1" x2="7" y2="2.5" />
      <line x1="7" y1="11.5" x2="7" y2="13" />
      <line x1="1" y1="7" x2="2.5" y2="7" />
      <line x1="11.5" y1="7" x2="13" y2="7" />
      <line x1="3" y1="3" x2="4.1" y2="4.1" />
      <line x1="9.9" y1="9.9" x2="11" y2="11" />
      <line x1="3" y1="11" x2="4.1" y2="9.9" />
      <line x1="9.9" y1="4.1" x2="11" y2="3" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8.5,3 5,7 8.5,11" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5.5,3 9,7 5.5,11" />
    </svg>
  );
}

// ── types ─────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: string;
  title: string;
  query: string;
  mode: string;
  voices: number;
  createdAt: string;
}

interface SessionGroups {
  hoje:   SessionItem[];
  ontem:  SessionItem[];
  semana: SessionItem[];
}

function groupByDate(sessions: SessionItem[]): SessionGroups {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const weekAgo   = today - 7 * 86_400_000;

  const groups: SessionGroups = { hoje: [], ontem: [], semana: [] };
  for (const s of sessions) {
    const t = new Date(s.createdAt);
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    if (d === today)     groups.hoje.push(s);
    else if (d === yesterday) groups.ontem.push(s);
    else if (d >= weekAgo)    groups.semana.push(s);
  }
  return groups;
}

// ── component ─────────────────────────────────────────────────────────────────

const NAV = [
  { href: '/',           label: 'Arena',        Icon: IconArena     },
  { href: '/library',    label: 'Biblioteca',   Icon: IconLibrary   },
  { href: '/workspace',  label: 'Workspace',    Icon: IconWorkspace },
  { href: '/settings',   label: 'Configuração', Icon: IconSettings  },
];

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    background: 'var(--surface-2)',
    borderRight: '0.5px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    height: 'var(--header-h)', padding: '0 14px',
    borderBottom: '0.5px solid var(--border)',
    cursor: 'pointer',
    flexShrink: 0, whiteSpace: 'nowrap',
  },
  mark: {
    flexShrink: 0,
    width: 24, height: 24, borderRadius: 6,
    background: 'var(--cream)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 600, color: 'var(--surface)',
    letterSpacing: '-0.3px',
  },
  brandLabel: {
    fontSize: 13, fontWeight: 500,
    color: 'var(--cream)', letterSpacing: '-0.3px',
  },
  nav: {
    padding: '6px 8px',
    borderBottom: '0.5px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: 1,
    flexShrink: 0,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '0 9px', height: 33,
    borderRadius: 7,
    color: 'var(--fg-muted)', cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background 0.12s, color 0.12s',
    fontSize: 12, fontWeight: 500,
    letterSpacing: '-0.1px',
  },
  historyWrap: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    padding: '4px 8px 10px',
    scrollbarWidth: 'none' as const,
  },
  resizeHandle: {
    position: 'absolute', top: 0, right: 0,
    width: 6, height: '100%',
    cursor: 'col-resize', zIndex: 50,
    background: 'transparent',
  },
  resizeLine: {
    position: 'absolute', top: 0, right: 0,
    width: 1, height: '100%',
    transition: 'background 0.12s',
  },
  groupLabel: {
    fontSize: 9, fontWeight: 500,
    color: 'var(--fg-faint)', letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    padding: '10px 6px 4px',
  },
  historyItem: {
    padding: '6px 8px', borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.12s',
    overflow: 'hidden', whiteSpace: 'nowrap',
    marginBottom: 1,
  },
  historyTitle: {
    fontSize: 11.5, color: 'var(--cream)',
    overflow: 'hidden', textOverflow: 'ellipsis',
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 10, color: 'var(--fg-muted)',
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  footer: {
    padding: '6px 8px',
    borderTop: '0.5px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: 1,
    flexShrink: 0,
  },
  footerBtn: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '0 9px', height: 32,
    borderRadius: 7,
    color: 'var(--fg-muted)', cursor: 'pointer',
    background: 'none', border: 'none',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap',
    transition: 'background 0.12s, color 0.12s',
    fontSize: 12, fontWeight: 500,
    width: '100%',
  },
};

export function Sidebar() {
  const {
    sidebarCollapsed, sidebarW, sidebarDefault,
    toggleSidebar, toggleTheme, theme, setSidebarWidth,
    isMobile, mobileNavOpen, closeMobileNav, openSession,
  } = useApp();
  const pathname = usePathname();
  const router   = useRouter();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  // drag-to-resize: sidebar is fixed at left:0, so width === pointer X
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setSidebarWidth(e.clientX);
    const onUp   = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, setSidebarWidth]);

  const groups = groupByDate(sessions);
  const groupEntries: [string, string, SessionItem[]][] = [
    ['hoje',   'Hoje',         groups.hoje],
    ['ontem',  'Ontem',        groups.ontem],
    ['semana', 'Esta semana',  groups.semana],
  ];

  const collapsed = sidebarCollapsed;

  return (
    <aside
      style={{
        ...s.sidebar,
        ...(isMobile
          ? {
              position: 'fixed', left: 0, top: 0,
              width: sidebarW, height: '100dvh', zIndex: 45,
              transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
              boxShadow: mobileNavOpen ? '0 0 40px rgba(0,0,0,0.5)' : 'none',
              transition: 'transform 0.2s ease',
            }
          : {
              // coluna 1 da grelha — em fluxo; a largura do elemento conduz a
              // pista `auto` e anima a recolha/expansão suavemente.
              position: 'relative',
              width: sidebarW, zIndex: 40,
              transition: dragging ? 'none' : 'width 0.2s ease',
            }),
      }}
    >

      {/* brand */}
      <div
        style={s.brand}
        onClick={isMobile ? closeMobileNav : toggleSidebar}
        title={isMobile ? 'Fechar' : collapsed ? 'Expandir' : 'Recolher'}
      >
        <div style={s.mark}>HL</div>
        {!collapsed && <span style={s.brandLabel}>Hydra Labs</span>}
      </div>

      {/* nav */}
      <nav style={s.nav}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href} href={href}
              style={{
                ...s.navItem,
                background: active ? 'var(--cream)' : hovered === href ? 'var(--surface-3)' : 'transparent',
                color: active ? 'var(--surface)' : hovered === href ? 'var(--cream)' : 'var(--fg-muted)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '0' : '0 9px',
              }}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { if (isMobile) closeMobileNav(); }}
            >
              <span style={{ flexShrink: 0 }}><Icon /></span>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* history */}
      {!collapsed && (
        <div style={s.historyWrap}>
          {groupEntries.map(([key, label, items]) =>
            items.length === 0 ? null : (
              <div key={key}>
                <div style={s.groupLabel}>{label}</div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      ...s.historyItem,
                      background: hovered === item.id ? 'var(--surface-3)' : 'transparent',
                    }}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => { openSession(item.id); router.push('/'); if (isMobile) closeMobileNav(); }}
                    title={item.title}
                  >
                    <div style={s.historyTitle}>{item.title}</div>
                    <div style={s.historyMeta}>{item.mode} · {item.voices} vozes</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {collapsed && <div style={{ flex: 1 }} />}

      {/* footer */}
      <div style={s.footer}>
        <button
          style={{
            ...s.footerBtn,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 9px',
          }}
          onClick={toggleTheme}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
            (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
          }}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
          {!collapsed && (
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            </span>
          )}
        </button>

        <button
          style={{
            ...s.footerBtn,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 9px',
          }}
          onClick={isMobile ? closeMobileNav : toggleSidebar}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
            (e.currentTarget as HTMLElement).style.color = 'var(--cream)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)';
          }}
        >
          {isMobile ? <IconChevronLeft /> : collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          {!collapsed && (
            <span style={{ fontSize: 12, fontWeight: 500 }}>{isMobile ? 'Fechar' : 'Recolher'}</span>
          )}
        </button>
      </div>

      {/* drag-to-resize handle (only when expanded, desktop only) */}
      {!collapsed && !isMobile && (
        <div
          style={s.resizeHandle}
          onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
          onDoubleClick={() => setSidebarWidth(sidebarDefault)}
          onMouseEnter={(e) => {
            const line = e.currentTarget.firstElementChild as HTMLElement | null;
            if (line) line.style.background = 'var(--cream)';
          }}
          onMouseLeave={(e) => {
            if (dragging) return;
            const line = e.currentTarget.firstElementChild as HTMLElement | null;
            if (line) line.style.background = 'transparent';
          }}
          title="Arraste para redimensionar · duplo-clique para repor"
        >
          <div style={{ ...s.resizeLine, background: dragging ? 'var(--cream)' : 'transparent' }} />
        </div>
      )}

    </aside>
  );
}
