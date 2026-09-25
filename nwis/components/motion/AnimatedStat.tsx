'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion/AnimationContext';
import { cn } from '@/lib/utils';

interface AnimatedStatProps {
  value: number;
  className?: string;
  duration?: number;
  format?: (val: number) => string;
}

export function AnimatedStat({ 
  value, 
  className, 
  duration = 0.8,
  format = (val) => Math.round(val).toString()
}: AnimatedStatProps) {
  const reducedMotion = useReducedMotion();
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { 
    duration: duration * 1000, 
    bounce: 0 
  });
  const displayValue = useTransform(springValue, (v) => format(v));

  useEffect(() => {
    if (reducedMotion) {
      motionValue.jump(value);
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{format(value)}</span>;
  }

  return (
    <motion.span className={cn(className, "tabular-nums")}>
      {displayValue}
    </motion.span>
  );
}
