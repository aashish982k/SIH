'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion/AnimationContext';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

interface HeadlineRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  delay?: number;
}

export function HeadlineReveal({ children, className, as = 'h1', delay = 0 }: HeadlineRevealProps) {
  const reducedMotion = useReducedMotion();
  const MotionComponent = motion.create(as as any);

  if (reducedMotion) {
    const Component = as as any;
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent
      initial={{ opacity: 0, y: motionTokens.distance.base }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.dur.base,
        ease: 'easeOut',
        delay: delay,
      }}
      className={cn(className)}
    >
      {children}
    </MotionComponent>
  );
}
