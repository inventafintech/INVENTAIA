import '../app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cerebro de Compras | INVENTA.AI',
  description: 'Predice qué comprar, cuándo comprarlo y cómo financiarlo antes de que ocurra un quiebre de stock.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
