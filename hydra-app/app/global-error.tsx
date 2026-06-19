'use client';

// Último recurso: apanha erros no próprio layout/providers (onde o error.tsx de
// segmento não chega). Tem de renderizar o seu próprio <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>A aplicação encontrou um erro</div>
            <pre style={{
              fontSize: 11.5, color: '#bbb',
              background: '#0d0d0d', border: '0.5px solid #2b2b2b', borderRadius: 8,
              padding: '10px 12px', maxWidth: '100%', overflowX: 'auto', whiteSpace: 'pre-wrap', textAlign: 'left', margin: 0,
            }}>
              {error?.message || 'Erro desconhecido'}{error?.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>
            <button
              onClick={() => reset()}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff', color: '#000', fontSize: 12, fontWeight: 500 }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
