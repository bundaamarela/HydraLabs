'use client';

interface QueryBubbleProps {
  query: string;
}

export function QueryBubble({ query }: QueryBubbleProps) {
  if (!query) return null;
  return (
    <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
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
