interface ThinkingIndicatorProps {
  readonly isThinking: boolean;
  readonly label: string;
}

export function ThinkingIndicator({ isThinking, label }: ThinkingIndicatorProps): JSX.Element {
  return (
    <div className="thinking" aria-hidden={!isThinking} data-testid="thinking-indicator">
      {isThinking && <><span className="thinking__spinner" aria-hidden="true"/><span className="thinking__text">{label}</span></>}
    </div>
  );
}
