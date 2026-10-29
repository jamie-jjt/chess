interface IconProps {
  readonly name: 'arrow' | 'expand' | 'collapse' | 'undo' | 'restart' | 'menu' | 'flip' | 'remove';
  readonly className?: string;
}

export function Icon({ name, className = '' }: IconProps): JSX.Element {
  const common = {
    className: `icon ${className}`.trim(),
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'arrow') return <svg {...common}><path d="M5 12h13M14 7l5 5-5 5" /></svg>;
  if (name === 'expand') return <svg {...common}><path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" /></svg>;
  if (name === 'collapse') return <svg {...common}><path d="M4 9h5V4M20 9h-5V4M15 20v-5h5M9 20v-5H4" /></svg>;
  if (name === 'undo') return <svg {...common}><path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" /></svg>;
  if (name === 'restart') return <svg {...common}><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5" /></svg>;
  if (name === 'flip') return <svg {...common}><path d="m7 7-3 3 3 3M4 10h12a4 4 0 0 1 4 4M17 17l3-3-3-3" /></svg>;
  if (name === 'remove') return <svg {...common}><path d="M5 12h14" /></svg>;
  return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
