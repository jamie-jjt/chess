import { useEffect, useRef, useState } from 'react';
import { colorLabel, pieceLabel } from '../engine';
import type { GameResult, MoveRecord, PieceColor } from '../engine';

interface GameAnnouncerProps {
  readonly history: readonly MoveRecord[];
  readonly turn: PieceColor;
  readonly isCheck: boolean;
  readonly result: GameResult;
}

export function GameAnnouncer({ history, turn, isCheck, result }: GameAnnouncerProps): JSX.Element {
  const previousLength = useRef(history.length);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const grew = history.length > previousLength.current;
    previousLength.current = history.length;
    if (!grew) return;
    const move = history[history.length - 1];
    if (move === undefined) return;
    const action = move.isCastle
      ? `castled ${move.san.includes('O-O-O') ? 'queenside' : 'kingside'}`
      : `${move.isCapture ? 'captured on' : 'played'} ${move.to}${move.isPromotion && move.promotion !== null ? `, promoting to ${pieceLabel(move.promotion)}` : ''}`;
    const ending = result.type === 'in-progress'
      ? `${colorLabel(turn)} to move${isCheck ? ', in check' : ''}.`
      : 'The game is over.';
    setMessage(`${colorLabel(move.color)} ${action}. ${ending}`);
  }, [history, isCheck, result, turn]);
  return <div className="visually-hidden" aria-live="polite" aria-atomic="true">{message}</div>;
}
