import type { Metadata } from 'next';
import { Providers } from '@/components/providers/WalletProvider';
import { Header } from '@/components/layout/Header';
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
          {/* Hackathon Disclaimer Banner */}
          <div className="bg-yellow-900/60 border-b border-yellow-700/50 px-4 py-2.5 text-center">
            <p className="text-xs text-yellow-200/90 max-w-4xl mx-auto">
              <span className="font-bold">WARNING:</span> This project was built for the{' '}
              <a href="https://moltiverse.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">Moltiverse Hackathon</a>{' '}
              in a short timeframe. It has <span className="font-bold">NOT been audited</span>. Only basic security measures are in place.
              It may contain bugs, errors, or unexpected behavior during order execution.{' '}
              <span className="font-bold">Use at your own risk.</span> Do not deposit funds you cannot afford to lose.
            </p>
          </div>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
