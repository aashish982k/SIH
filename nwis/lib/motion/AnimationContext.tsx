'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

interface AnimationContextValue {
  hasPlayedHero: boolean;
  setHasPlayedHero: (val: boolean) => void;
  prefersReducedMotion: boolean;
}

const AnimationContext = createContext<AnimationContextValue | undefined>(undefined);

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [hasPlayedHero, setHasPlayedHeroState] = useState(true); // Default true to prevent flash, check in effect
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check session storage
    const played = sessionStorage.getItem('nwis_hero_played') === 'true';
    setHasPlayedHeroState(played);

    // Check reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setHasPlayedHero = (val: boolean) => {
    setHasPlayedHeroState(val);
    sessionStorage.setItem('nwis_hero_played', String(val));
  };

  const value = useMemo(() => ({
    hasPlayedHero,
    setHasPlayedHero,
    prefersReducedMotion
  }), [hasPlayedHero, prefersReducedMotion]);

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimationContext() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
}

export function useReducedMotion() {
  const { prefersReducedMotion } = useAnimationContext();
  return prefersReducedMotion;
}
