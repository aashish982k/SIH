'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useRTMACFeed } from '@/hooks/useRTMACFeed';
import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

function RTMACProvider({ children }: { children: React.ReactNode }) {
  useRTMACFeed();
  return <>{children}</>;
}

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const setIsAdmin = useAppStore(s => s.setIsAdmin);
  useEffect(() => {
    // Rehydrate admin state from localStorage on mount
    const role = localStorage.getItem('nwis_role');
    if (role === 'admin') setIsAdmin(true);
  }, [setIsAdmin]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <AuthHydrator>
        <RTMACProvider>
          {children}
        </RTMACProvider>
      </AuthHydrator>
    </TooltipProvider>
  );
}
