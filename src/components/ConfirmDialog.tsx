import { createPortal } from 'react-dom';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface ConfirmDialogProps {
  readonly title: string;
  readonly detail: string;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({ title, detail, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps): JSX.Element {
  const ref = useDialogFocus<HTMLDivElement>({ onEscape: onCancel, initialFocusSelector: '[data-dialog-cancel]', inertBackground: true });
  return createPortal(
    <div className="modal-backdrop">
      <div ref={ref} className="modal modal--confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-detail">
        <p className="modal__eyebrow">Confirm action</p>
        <h2 className="modal__title" id="confirm-title">{title}</h2>
        <p className="modal__detail" id="confirm-detail">{detail}</p>
        <div className="modal__actions">
          <button type="button" className="button button--danger" onClick={onConfirm}>{confirmLabel}</button>
          <button type="button" className="button button--ghost" onClick={onCancel} data-dialog-cancel>Cancel</button>
        </div>
      </div>
    </div>,
    document.getElementById('dialog-root') ?? document.body,
  );
}
