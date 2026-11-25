const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true } as const;

export const ChevronLeft = () => (
  <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>
);

export const ChevronRight = () => (
  <svg {...base}><path d="M9 5l7 7-7 7" /></svg>
);

export const Close = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
