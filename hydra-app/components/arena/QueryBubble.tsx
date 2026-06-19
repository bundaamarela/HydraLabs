'use client';

import type { Attachment } from '@/lib/orchestrator';

interface QueryBubbleProps {
  query: string;
  attachment?: Attachment | null;
}

export function QueryBubble({ query, attachment }: QueryBubbleProps) {
  if (!query) return null;
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {attachment && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 6, padding: '4px 9px', fontSize: 11, color: 'var(--cream)',
          maxWidth: '65%',
        }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.5px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
            {attachment.kind}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {attachment.name}
          </span>
        </div>
      )}
      <div style={{
        maxWidth: '65%',
        background: 'var(--surface-3)',
        border: '0.5px solid var(--border)',
        borderRadius: '10px 10px 2px 10px',
        padding: '10px 14px',
        fontSize: 13.5,
        color: 'var(--cream)',
        lineHeight: 1.6,
        letterSpacing: '-0.1px',
      }}>
        <span style={{ color: 'var(--fg-faint)', marginRight: 5, fontSize: 14 }}>"</span>
        {query}
        <span style={{ color: 'var(--fg-faint)', marginLeft: 5, fontSize: 14 }}>"</span>
      </div>
    </div>
  );
}
