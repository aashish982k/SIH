import type { Variants } from 'framer-motion';

// ─── Shared Framer Motion Variants ────────────────────────────────────────────
// Single source of truth so pages don't drift apart on animation timings.

export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export const staggerFast: Variants = {
  visible: { transition: { staggerChildren: 0.05 } },
};
