import type { Metadata } from 'next';
import { Barlow, Barlow_Semi_Condensed, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow' });
const barlowCond = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-barlow-cond' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: { default: 'NWIS · Nearby Wells Intelligence', template: '%s · NWIS' },
  description: 'Offset-well knowledge and drilling decision support for Oil India Limited, alongside eRTMAC.',
};

// Applies the saved theme before first paint (no light/dark flash)
const themeScript = `try{var s=JSON.parse(localStorage.getItem('nwis')||'{}');var t=(s.state&&s.state.theme)||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${barlow.variable} ${barlowCond.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
