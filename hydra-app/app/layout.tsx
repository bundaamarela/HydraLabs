import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './providers';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: 'Hydra Labs',
  description: 'Consulta 6 inteligências em simultâneo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Aplica o tema personalizado (hydra_theme) antes de pintar — sem flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('hydra_theme')||'{}');var r=document.documentElement;if(t.accent)r.style.setProperty('--accent',t.accent);if(t.fontUi)r.style.setProperty('--font-ui',t.fontUi);if(t.fontRead)r.style.setProperty('--font-read',t.fontRead);if(t.density)r.setAttribute('data-density',t.density);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
