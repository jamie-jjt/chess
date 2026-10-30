import bb from '../assets/pieces/meridian_shaded/bb.svg';
import bk from '../assets/pieces/meridian_shaded/bk.svg';
import bn from '../assets/pieces/meridian_shaded/bn.svg';
import bp from '../assets/pieces/meridian_shaded/bp.svg';
import bq from '../assets/pieces/meridian_shaded/bq.svg';
import br from '../assets/pieces/meridian_shaded/br.svg';
import wb from '../assets/pieces/meridian_shaded/wb.svg';
import wk from '../assets/pieces/meridian_shaded/wk.svg';
import wn from '../assets/pieces/meridian_shaded/wn.svg';
import wp from '../assets/pieces/meridian_shaded/wp.svg';
import wq from '../assets/pieces/meridian_shaded/wq.svg';
import wr from '../assets/pieces/meridian_shaded/wr.svg';
import type { PieceColor, PieceType } from '../engine';

interface ChessPieceSvgProps {
  readonly type: PieceType;
  readonly color: PieceColor;
}

const PIECE_ASSETS: Readonly<Record<PieceColor, Readonly<Record<PieceType, string>>>> = {
  b: { b: bb, k: bk, n: bn, p: bp, q: bq, r: br },
  w: { b: wb, k: wk, n: wn, p: wp, q: wq, r: wr },
};

export function ChessPieceSvg({ type, color }: ChessPieceSvgProps): JSX.Element {
  return (
    <img
      className="chess-piece-svg"
      src={PIECE_ASSETS[color][type]}
      alt=""
      draggable={false}
      decoding="async"
    />
  );
}
