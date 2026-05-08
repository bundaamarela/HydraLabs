import type { Session, Response } from '@prisma/client';

type FullSession = Session & { responses: Response[] };

// ── Markdown ─────────────────────────────────────────────────────────────────

export function toMarkdown(session: FullSession): string {
  const date = session.createdAt.toLocaleDateString('pt-PT');
  const lines: string[] = [
    `# ${session.title}`,
    ``,
    `**Query:** ${session.query}  `,
    `**Modo:** ${session.mode}  `,
    `**Data:** ${date}  `,
    `**Vozes:** ${session.voices}`,
    ``,
    `---`,
    ``,
  ];

  for (const r of session.responses) {
    lines.push(`## ${r.model}`, ``, r.content, ``);
  }

  if (session.synthesis) {
    lines.push(`---`, ``, `## Síntese`, ``, session.synthesis, ``);
  }

  if (session.notes) {
    lines.push(`---`, ``, `## Notas`, ``, session.notes, ``);
  }

  return lines.join('\n');
}

// ── JSON ─────────────────────────────────────────────────────────────────────

export function toJSON(session: FullSession): string {
  return JSON.stringify(
    {
      id: session.id,
      title: session.title,
      query: session.query,
      mode: session.mode,
      voices: session.voices,
      createdAt: session.createdAt,
      responses: session.responses.map((r) => ({
        model: r.model,
        content: r.content,
      })),
      synthesis: session.synthesis ?? null,
      notes: session.notes ?? null,
    },
    null,
    2,
  );
}

// ── EPUB (minimal — plain HTML wrapped in EPUB structure) ─────────────────────

export function toEPUBHtml(session: FullSession): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const responseBlocks = session.responses
    .map(
      (r) =>
        `<section><h2>${escape(r.model)}</h2><p>${escape(r.content)}</p></section>`,
    )
    .join('\n');

  const synthBlock = session.synthesis
    ? `<section><h2>Síntese</h2><p>${escape(session.synthesis)}</p></section>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escape(session.title)}</title></head>
<body>
<h1>${escape(session.title)}</h1>
<p><strong>Query:</strong> ${escape(session.query)}</p>
<p><strong>Modo:</strong> ${escape(session.mode)}</p>
${responseBlocks}
${synthBlock}
</body>
</html>`;
}
