import { useCallback, useEffect, useState } from 'react';

interface UseFullscreenValue {
  readonly supported: boolean;
  readonly active: boolean;
  readonly error: string | null;
  readonly toggle: () => void;
}

export function useFullscreen(): UseFullscreenValue {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const available =
      typeof document !== 'undefined' &&
      document.fullscreenEnabled === true &&
      typeof document.documentElement.requestFullscreen === 'function';
    setSupported(available);
    if (!available) return;

    const sync = (): void => {
      setActive(document.fullscreenElement !== null);
      setError(null);
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback((): void => {
    setError(null);
    const request = active
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    if (request === undefined) return;
    void request.catch(() => {
      setError('Full screen could not be opened. The game still fills this window.');
    });
  }, [active]);

  return { supported, active, error, toggle };
}
