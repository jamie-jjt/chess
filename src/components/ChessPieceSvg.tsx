import { useId } from 'react';
import type { PieceColor, PieceType } from '../engine';

interface ChessPieceSvgProps {
  readonly type: PieceType;
  readonly color: PieceColor;
}

function PieceShape({ type }: { readonly type: PieceType }): JSX.Element {
  if (type === 'k') {
    return <><path d="M46 7h8v12h12v8H54v11h-8V27H34v-8h12z"/><path d="M35 40c8-5 22-5 30 0l-4 16c10 8 15 20 15 34H24c0-14 5-26 15-34z"/><path d="M20 89h60l7 14H13z"/></>;
  }
  if (type === 'q') {
    return <><circle cx="19" cy="25" r="6"/><circle cx="50" cy="16" r="6"/><circle cx="81" cy="25" r="6"/><path d="M18 34l14 19 18-28 18 28 14-19-9 55H27z"/><path d="M21 89h58l7 14H14z"/></>;
  }
  if (type === 'r') {
    return <><path d="M16 17h20v13h13V17h14v13h13V17h9v29l-10 9 4 34H21l4-34-10-9z"/><path d="M17 89h66l6 14H11z"/></>;
  }
  if (type === 'b') {
    return <><path d="M50 11c15 14 23 26 23 38 0 10-6 18-16 24l16 16H27l16-16c-10-6-16-14-16-24 0-12 8-24 23-38z"/><path d="M21 89h58l7 14H14z"/><path className="piece-cut" d="M59 30 41 58"/></>;
  }
  if (type === 'n') {
    return <><path d="M27 89c2-21 8-38 21-50l-9-17 22 7 14-9c3 19 1 32-7 42l8 27z"/><path d="M21 89h59l7 14H13z"/><path className="piece-cut" d="M56 43l7 2M41 66c9 1 18-2 24-9"/></>;
  }
  return <><circle cx="50" cy="30" r="16"/><path d="M37 47h26c0 16 6 28 14 42H23c8-14 14-26 14-42z"/><path d="M19 89h62l7 14H12z"/></>;
}

function Highlights({ type }: { readonly type: PieceType }): JSX.Element {
  if (type === 'p') return <path d="M42 20c-5 3-7 8-7 13M31 85c5-12 10-23 10-34"/>;
  if (type === 'n') return <path d="M45 33c-7 8-12 17-15 29M25 94h47"/>;
  if (type === 'r') return <path d="M21 21v21l9 9-4 31M23 94h49"/>;
  if (type === 'b') return <path d="M46 18c-9 10-14 20-14 30M28 94h44"/>;
  if (type === 'q') return <path d="M23 38l10 13 15-23M23 94h49"/>;
  return <path d="M39 44c-7 9-10 21-10 38M21 94h51"/>;
}

export function ChessPieceSvg({ type, color }: ChessPieceSvgProps): JSX.Element {
  const rawId = useId().replace(/:/g, '');
  const finishId = `piece-finish-${rawId}`;
  return (
    <svg className="chess-piece-svg" viewBox="0 0 100 112" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={finishId} x1="0" y1="0" x2="1" y2="1">
          {color === 'w' ? (
            <><stop offset="0" stopColor="#fffaf0"/><stop offset="0.52" stopColor="#eee3ca"/><stop offset="1" stopColor="#bcae8f"/></>
          ) : (
            <><stop offset="0" stopColor="#604530"/><stop offset="0.5" stopColor="#35261d"/><stop offset="1" stopColor="#17110e"/></>
          )}
        </linearGradient>
      </defs>
      <ellipse className="piece-contact-shadow" cx="50" cy="104" rx="34" ry="4"/>
      <g className="piece-silhouette" style={{ fill: `url(#${finishId})` }}><PieceShape type={type}/></g>
      <g className="piece-highlight"><Highlights type={type}/></g>
      <path className="piece-base-shade" d="M16 99h68l3 5H13z"/>
    </svg>
  );
}
