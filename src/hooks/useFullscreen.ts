import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface UseFullscreenValue {
  readonly supported: boolean;
  readonly active: boolean;
  readonly error: string | null;
  readonly toggle: () => void;
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>): UseFullscreenValue {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    const available =
      typeof document !== 'undefined' &&
      document.fullscreenEnabled === true &&
      target !== null &&
      typeof target.requestFullscreen === 'function';
    setSupported(available);
    if (!available) return;

    const sync = (): void => {
      setActive(document.fullscreenElement === targetRef.current);
      setError(null);
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [targetRef]);

  const toggle = useCallback((): void => {
    setError(null);
    const target = targetRef.current;
    const request = active
      ? document.exitFullscreen?.()
      : target?.requestFullscreen?.();
    if (request === undefined) return;
    void request.catch(() => {
      setError('Full screen could not be opened. The game still fills this window.');
    });
  }, [active, targetRef]);

  return { supported, active, error, toggle };
}
