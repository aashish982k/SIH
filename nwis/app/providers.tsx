'use client';

import { useEffect } from 'react';
import { useApp } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return <>{children}</>;
}
