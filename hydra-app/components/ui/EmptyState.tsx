'use client';

import Link from 'next/link';
import type { ReactNode, CSSProperties } from 'react';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

const primaryBtn: CSSProperties = {
  marginTop: 4,
  padding: '8px 18px', borderRadius: 8,
  background: 'var(--cream)', color: 'var(--surface)',
  fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
};

/**
 * Estado vazio partilhado — mesma linguagem visual em toda a app: ícone num
 * quadrado arredondado, título, uma linha de descrição e acção primária opcional.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 12,
      padding: '64px 24px',
      animation: 'fadeSlideUp 0.3s ease',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 13,
        background: 'var(--surface-2)', border: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-muted)',
      }}>
        {icon}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--cream)' }}>
        {title}
      </div>

      <div style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 300, lineHeight: 1.6 }}>
        {description}
      </div>

      {action && (
        action.href
          ? <Link href={action.href} style={primaryBtn}>{action.label}</Link>
          : <button onClick={action.onClick} style={primaryBtn}>{action.label}</button>
      )}
    </div>
  );
}
