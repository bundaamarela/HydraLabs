'use client';

import { useEffect } from 'react';

// Error boundary de segmento (App Router): apanha erros de render/efeito de
// QUALQUER página e mostra o erro em vez de um ecrã branco. Mantém o shell.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // fica também na Console do browser para diagnóstico
    console.error('[Hydra error boundary]', error);
  }, [error]);

  return (
    <div style={{
      height: '100%', minHeight: 0, flex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--surface)', color: 'var(--cream)',
    }}>
      <div style={{
        maxWidth: 560, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: 'var(--err)',
        }}>
          !
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Algo correu mal nesta página</div>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
          O erro abaixo foi capturado (em vez de um ecrã branco). Copia-o se persistir.
        </p>
        <pre style={{
          fontSize: 11.5, color: 'var(--cream-2)',
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '10px 12px',
          maxWidth: '100%', overflowX: 'auto', whiteSpace: 'pre-wrap',
          textAlign: 'left', margin: 0,
        }}>
          {error?.message || 'Erro desconhecido'}{error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--cream)', color: 'var(--surface)', fontSize: 12, fontWeight: 500,
            }}
          >
            Tentar de novo
          </button>
          <button
            onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
            style={{
              padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
              background: 'var(--surface-2)', color: 'var(--cream)',
              border: '0.5px solid var(--border)', fontSize: 12, fontWeight: 500,
            }}
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
