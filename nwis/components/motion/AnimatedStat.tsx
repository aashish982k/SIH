'use client';

import React, { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
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
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !nodeRef.current) return;
    
    const node = nodeRef.current;
    
    const controls = animate(prevValueRef.current, value, {
      duration,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = format(v);
      }
    });
    
    prevValueRef.current = value;

    return () => controls.stop();
  }, [value, duration, format, reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{format(value)}</span>;
  }

  return (
    <span ref={nodeRef} className={cn(className, "tabular-nums")}>
      {format(prevValueRef.current)}
    </span>
  );
}
