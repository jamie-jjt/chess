import type { UseFullscreenValue } from '../hooks/useFullscreen';
import { Icon } from './Icon';

interface FullscreenButtonProps {
  readonly fullscreen: UseFullscreenValue;
}

export function FullscreenButton({ fullscreen }: FullscreenButtonProps): JSX.Element | null {
  if (!fullscreen.supported) return null;

  const label = fullscreen.active ? 'Exit board full screen' : 'Enter board full screen';
  return (
    <div className="fullscreen-control">
      <button
        type="button"
        className="topbar__button"
        onClick={fullscreen.toggle}
        aria-label={label}
        aria-pressed={fullscreen.active}
      >
        <Icon name={fullscreen.active ? 'collapse' : 'expand'} />
        <span className="topbar__button-label">{label}</span>
      </button>
      {fullscreen.error !== null && (
        <span className="visually-hidden" role="status" aria-live="polite">
          {fullscreen.error}
        </span>
      )}
    </div>
  );
}
