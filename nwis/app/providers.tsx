'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { useRTMACFeed } from '@/hooks/useRTMACFeed';
import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { AnimationProvider } from '@/lib/motion/AnimationContext';

function RTMACProvider({ children }: { children: React.ReactNode }) {
  useRTMACFeed();
  return <>{children}</>;
}

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrateAuth = useAppStore(s => s.hydrateAuth);
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AnimationProvider>
      <TooltipProvider delay={300}>
        <AuthHydrator>
          <RTMACProvider>
            {children}
          </RTMACProvider>
        </AuthHydrator>
      </TooltipProvider>
    </AnimationProvider>
  );
}
