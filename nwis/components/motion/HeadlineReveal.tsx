'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion/AnimationContext';
import { motionTokens } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

type AllowedTags = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const motionComponents = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  p: motion.p,
  span: motion.span,
  div: motion.div,
};

interface HeadlineRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: AllowedTags;
  delay?: number;
}

export function HeadlineReveal({ children, className, as = 'h1', delay = 0 }: HeadlineRevealProps) {
  const reducedMotion = useReducedMotion();
  const MotionComponent = motionComponents[as] || motion.div;

  if (reducedMotion) {
    const Component = as;
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
