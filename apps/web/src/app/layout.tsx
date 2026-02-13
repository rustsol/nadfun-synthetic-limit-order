import type { Metadata } from 'next';
import { Providers } from '@/components/providers/WalletProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synthetic Order Flow',
  description: 'AI-agent powered synthetic limit orders for tokens on Monad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
