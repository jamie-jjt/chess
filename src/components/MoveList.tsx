import { useEffect, useRef } from 'react';
import type { MoveRecord } from '../engine';

interface MoveListProps { readonly history: readonly MoveRecord[]; }
interface MovePair { readonly number: number; readonly white: MoveRecord | null; readonly black: MoveRecord | null; }

function toPairs(history: readonly MoveRecord[]): readonly MovePair[] {
  const pairs: MovePair[] = [];
  for (let index = 0; index < history.length; index += 2) {
    pairs.push({ number: Math.floor(index / 2) + 1, white: history[index] ?? null, black: history[index + 1] ?? null });
  }
  return pairs;
}

export function MoveList({ history }: MoveListProps): JSX.Element {
  const pairs = toPairs(history);
  const latestRef = useRef<HTMLSpanElement>(null);
  useEffect(() => { latestRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [history.length]);

  return (
    <section className="moves" aria-label="Move list">
      <h2 className="panel__title">Move ledger</h2>
      {pairs.length === 0 ? (
        <p className="moves__empty">No moves yet. White begins.</p>
      ) : (
        <>
          <div className="moves__head" aria-hidden="true"><span>Move</span><span>White</span><span>Black</span></div>
          <ol className="moves__list">
            {pairs.map((pair, pairIndex) => {
              const whiteLatest = pairIndex * 2 === history.length - 1;
              const blackLatest = pairIndex * 2 + 1 === history.length - 1;
              return (
                <li className="moves__pair" key={pair.number}>
                  <span className="moves__number">{pair.number}.</span>
                  <span className={`moves__san${whiteLatest ? ' moves__san--latest' : ''}`} aria-current={whiteLatest ? 'true' : undefined} ref={whiteLatest ? latestRef : undefined}>{pair.white?.san ?? ''}</span>
                  <span className={`moves__san${blackLatest ? ' moves__san--latest' : ''}`} aria-current={blackLatest ? 'true' : undefined} ref={blackLatest ? latestRef : undefined}>{pair.black?.san ?? ''}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
