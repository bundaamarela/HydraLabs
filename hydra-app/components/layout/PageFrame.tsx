'use client';

import { forwardRef, type ReactNode, type CSSProperties, type Ref } from 'react';
import { useApp } from '@/app/providers';

// Hamburger — só aparece na banda em modo mobile (abre o drawer da sidebar).
function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <line x1="2.5" y1="4.5"  x2="13.5" y2="4.5" />
      <line x1="2.5" y1="8"    x2="13.5" y2="8" />
      <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
    </svg>
  );
}

interface PageFrameProps {
  /** Conteúdo do lado esquerdo da banda (título / controlos primários). */
  title?: ReactNode;
  /** Conteúdo do lado direito da banda (acções). */
  actions?: ReactNode;
  children: ReactNode;
  /**
   * true (default): a região de conteúdo faz scroll vertical sozinha.
   * false: a região é uma coluna flex sem scroll — a página gere o seu próprio
   * layout interno (ex.: Arena = área que rola + input fixo no fundo).
   */
  scroll?: boolean;
  contentStyle?: CSSProperties;
  contentClassName?: string;
}

/**
 * Moldura partilhada por todas as páginas dentro do shell fixo. Garante uma banda
 * de cabeçalho de altura var(--header-h) — alinhada com o bloco-logo da sidebar,
 * formando um topo contínuo — e uma região de conteúdo que é a única coisa que rola.
 */
export const PageFrame = forwardRef(function PageFrame(
  { title, actions, children, scroll = true, contentStyle, contentClassName }: PageFrameProps,
  ref: Ref<HTMLDivElement>,
) {
  const { isMobile, openMobileNav } = useApp();

  return (
    <>
      <header
        style={{
          height: 'var(--header-h)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '0 16px',
          background: 'var(--surface-2)',
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {isMobile && (
            <button
              onClick={openMobileNav}
              aria-label="Abrir menu"
              style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cream)', background: 'var(--surface-3)',
                border: '0.5px solid var(--border)',
              }}
            >
              <IconMenu />
            </button>
          )}
          {title}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </header>

      <div
        ref={ref}
        className={contentClassName}
        style={{
          flex: 1, minHeight: 0,
          ...(scroll
            ? { overflowY: 'auto' }
            : { display: 'flex', flexDirection: 'column', overflow: 'hidden' }),
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </>
  );
});
