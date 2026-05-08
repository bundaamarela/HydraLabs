import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './providers';
import { AppShell } from './AppShell';

export const metadata: Metadata = {
  title: 'Hydra Labs',
  description: 'Consulta 8 inteligências em simultâneo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" data-theme="dark">
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
