import { useFullscreen } from '../hooks/useFullscreen';
import { Icon } from './Icon';

export function FullscreenButton(): JSX.Element | null {
  const fullscreen = useFullscreen();
  if (!fullscreen.supported) return null;

  const label = fullscreen.active ? 'Exit full screen' : 'Enter full screen';
  return (
    <div className="fullscreen-control">
      <button type="button" className="topbar__button" onClick={fullscreen.toggle} aria-label={label}>
        <Icon name={fullscreen.active ? 'collapse' : 'expand'} />
        <span className="topbar__button-label">{label}</span>
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {fullscreen.error}
      </span>
    </div>
  );
}
