'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface Template { id: string; name: string; body: string; }

interface TemplatesMenuProps {
  currentInput: string;
  onInsert: (body: string) => void;
}

function IconPencil() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5Z" />
    </svg>
  );
}

const iconBtn: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 20, height: 20, borderRadius: 4,
  color: 'var(--fg-faint)', cursor: 'pointer', flexShrink: 0,
  transition: 'color 0.1s',
};

export function TemplatesMenu({ currentInput, onInsert }: TemplatesMenuProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d: Template[]) => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const saveCurrent = async () => {
    const name = newName.trim();
    if (!name || !currentInput.trim() || saving) return;
    setSaving(true);
    try {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body: currentInput }),
      });
      setNewName('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setTemplates((t) => t.filter((x) => x.id !== id));
    try { await fetch(`/api/templates/${id}`, { method: 'DELETE' }); } catch { /* ignore */ }
  };

  const commitRename = async (id: string) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    setTemplates((t) => t.map((x) => (x.id === id ? { ...x, name } : x)));
    try {
      await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } catch { /* ignore */ }
  };

  const canSave = newName.trim().length > 0 && currentInput.trim().length > 0;

  const fieldStyle: CSSProperties = {
    flex: 1, background: 'var(--surface)', border: '0.5px solid var(--border)',
    borderRadius: 6, padding: '5px 8px', fontSize: 11.5, color: 'var(--cream)', outline: 'none',
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Templates de consulta"
        style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
          padding: '3px 9px', borderRadius: 4,
          background: open ? 'var(--cream)' : 'var(--surface-2)',
          color: open ? 'var(--ink)' : 'var(--fg-muted)',
          border: '0.5px solid var(--border)', cursor: 'pointer',
          transition: 'background 0.1s, color 0.1s',
        }}
      >
        TEMPLATES
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          width: 280, maxHeight: 320, overflowY: 'auto',
          background: 'var(--surface-2)', border: '0.5px solid var(--border)',
          borderRadius: 10, zIndex: 60, padding: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)', animation: 'popIn 0.12s ease',
        }}>
          {/* guardar input actual */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveCurrent(); }}
              placeholder={currentInput.trim() ? 'Guardar atual como…' : 'Escreve algo no input primeiro'}
              disabled={!currentInput.trim()}
              style={{ ...fieldStyle, opacity: currentInput.trim() ? 1 : 0.6 }}
            />
            <button
              onClick={saveCurrent}
              disabled={!canSave || saving}
              style={{
                flexShrink: 0, padding: '0 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: canSave ? 'var(--cream)' : 'var(--surface-3)',
                color: canSave ? 'var(--ink)' : 'var(--fg-faint)',
                border: '0.5px solid var(--border)', cursor: canSave ? 'pointer' : 'default',
              }}
            >
              Guardar
            </button>
          </div>

          <div style={{ height: 0.5, background: 'var(--border)', margin: '0 -8px 8px' }} />

          {loading ? (
            <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', padding: '6px 4px' }}>A carregar…</div>
          ) : templates.length === 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', padding: '6px 4px', lineHeight: 1.5 }}>
              Sem templates. Guarda o input actual ou usa {'{{'}placeholder{'}}'} para campos a preencher.
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}
              >
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(t.id); if (e.key === 'Escape') setRenamingId(null); }}
                    onBlur={() => commitRename(t.id)}
                    style={fieldStyle}
                  />
                ) : (
                  <button
                    onClick={() => { onInsert(t.body); setOpen(false); }}
                    title={t.body}
                    style={{
                      flex: 1, textAlign: 'left', padding: '6px 8px', borderRadius: 6,
                      fontSize: 12, color: 'var(--cream)', cursor: 'pointer',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {t.name}
                  </button>
                )}
                <button
                  onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                  title="Renomear"
                  style={iconBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
                >
                  <IconPencil />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  title="Apagar"
                  style={iconBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
