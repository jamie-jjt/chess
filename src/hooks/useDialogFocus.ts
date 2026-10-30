import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogFocusOptions {
  readonly onEscape?: () => void;
  readonly initialFocusSelector?: string;
  readonly inertBackground?: boolean;
  readonly inertTarget?: HTMLElement | null | undefined;
}

export function useDialogFocus<T extends HTMLElement>({
  onEscape,
  initialFocusSelector,
  inertBackground = false,
  inertTarget,
}: DialogFocusOptions): RefObject<T> {
  const dialogRef = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = inertBackground
      ? inertTarget ?? document.getElementById('app-surface') ?? document.getElementById('app-content')
      : null;
    const wasInert = background?.inert ?? false;
    if (background !== null) background.inert = true;

    const initial = initialFocusSelector === undefined
      ? dialog.querySelector<HTMLElement>(FOCUSABLE)
      : dialog.querySelector<HTMLElement>(initialFocusSelector);
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && escapeRef.current !== undefined) {
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => !item.hidden);
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (background !== null) background.inert = wasInert;
      previousFocus?.focus();
    };
  }, [initialFocusSelector, inertBackground, inertTarget]);

  return dialogRef;
}
