import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
