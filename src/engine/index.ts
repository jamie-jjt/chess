export { ChessGame } from './chessGame';
export {
  ALL_SQUARES,
  EMPTY_FEN,
  FILES,
  RANKS,
  START_FEN,
  areAdjacent,
  checkFen,
  fileIndexOf,
  isSquareId,
  isValidFen,
  parseFen,
  rankOf,
  squareShade,
  toSquareId,
} from './fen';
export type { FenCheck, FenFields, FileLetter, RankNumber } from './fen';
export {
  ALL_CASTLING,
  CASTLING_FLAGS,
  EMPTY_SETUP,
  NO_CASTLING,
  castlingToFen,
  charToPiece,
  countOf,
  entriesOf,
  entriesOfColor,
  kingSquare,
  movePiece,
  pieceToChar,
  placePiece,
  placementToFen,
  removePiece,
  setupFromFen,
  setupToFen,
  squaresOf,
  standardSetup,
  totalPieces,
} from './setupPosition';
export type {
  CastlingFlag,
  CastlingRights,
  PiecePlacement,
  PlacedEntry,
  SetupFromFen,
  SetupPosition,
} from './setupPosition';
export {
  PROMOTION_PIECES,
  colorLabel,
  isPromotionPiece,
  oppositeColor,
  pieceLabel,
} from './pieces';
export { describeResult } from './results';
export type { ResultDescription } from './results';
export type {
  BoardCell,
  BoardMatrix,
  DrawReason,
  GameResult,
  GameSnapshot,
  LegalMove,
  MoveRecord,
  PieceColor,
  PieceType,
  PlacedPiece,
  PromotionPiece,
  SquareId,
} from './types';
