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
  const checkAuth = useAppStore(s => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
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
