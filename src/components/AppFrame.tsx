import type { ReactNode } from 'react';

interface AppFrameProps {
  readonly context: string;
  readonly children: ReactNode;
}

export function AppFrame({ context, children }: AppFrameProps): JSX.Element {
  return (
    <div className="app-frame">
      <div className="app-frame__surface" id="app-surface">
        <header className="topbar">
          <div className="topbar__identity" aria-label={`Chess, ${context}`}>
            <span className="topbar__brand" aria-hidden="true">Chess</span>
            <span className="topbar__context">{context}</span>
          </div>
        </header>
        <div className="app-frame__content" id="app-content">{children}</div>
      </div>
      <div id="dialog-root" />
    </div>
  );
}
