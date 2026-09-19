import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'NWIS — Nearby Wells Intelligence System',
    template: '%s | NWIS',
  },
  description:
    'AI-powered drilling risk decision-support platform for Oil India Limited. Real-time offset well intelligence, formation correlation, and risk assessment.',
  keywords: ['drilling', 'oil', 'wells', 'risk assessment', 'Oil India Limited', 'eRTMAC'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
