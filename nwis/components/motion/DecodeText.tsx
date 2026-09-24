'use client';

import React, { useRef, useEffect } from 'react';
import { gsap, ScrambleTextPlugin } from '@/lib/motion/gsap';
import { useReducedMotion } from '@/lib/motion/AnimationContext';
import { cn } from '@/lib/utils';

interface DecodeTextProps {
  text: string | number;
  className?: string;
  chars?: string; // default "0123456789"
}

export function DecodeText({ text, className, chars = "0123456789" }: DecodeTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (reducedMotion || !textRef.current) return;

    if (prevTextRef.current !== text) {
      gsap.to(textRef.current, {
        duration: 0.6,
        scrambleText: {
          text: String(text),
          chars: chars,
          revealDelay: 0.1,
          tweenLength: false
        },
        ease: "power2.out"
      });
      prevTextRef.current = text;
    }
  }, [text, reducedMotion, chars]);

  // Initial render
  useEffect(() => {
    if (reducedMotion || !textRef.current) return;
    
    gsap.to(textRef.current, {
      duration: 0.6,
      scrambleText: {
        text: String(text),
        chars: chars,
        revealDelay: 0.1,
        tweenLength: false
      },
      ease: "power2.out"
    });
  }, []); // Run once on mount

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span ref={textRef} className={cn(className, "tabular-nums")}>
      {text}
    </span>
  );
}
