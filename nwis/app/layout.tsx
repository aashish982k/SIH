import type { Metadata } from 'next';
import './globals.css';
import { TacticalTopBar } from '@/components/layout/TacticalTopBar';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'NWIS — Nearby Wells Intelligence System | Oil India Limited',
    template: '%s | NWIS',
  },
  description:
    'AI-powered subsurface institutional memory & drilling decision support platform for Oil India Limited (eRTMAC companion).',
  keywords: ['drilling', 'oil', 'wells', 'risk assessment', 'Oil India Limited', 'eRTMAC', 'subsurface intelligence'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#070A0E] text-[#E2E8F0] antialiased selection:bg-[#F59E0B] selection:text-black">
        <Providers>
          <TacticalTopBar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
