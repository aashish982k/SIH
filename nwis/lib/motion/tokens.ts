export const motionTokens = {
  dur: {
    micro: 0.2, // Hover, small swaps
    base: 0.4,  // Titles, panels, text swaps
    hero: 1.0,  // Landing hero headline only
  },
  ease: {
    enter: 'power3.out',
    hero: 'expo.out',
  },
  stagger: {
    lines: 0.08,
    chars: 0.03, // Only for very short text (<= 3 words)
  },
  blur: {
    max: 8, // Hero only
  },
  distance: {
    base: 12, // Vertical travel fades and slides
  }
};
