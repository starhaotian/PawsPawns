// 全局共享类型定义。
import type { Color, PieceSymbol, Square } from 'chess.js';

export type { Color, PieceSymbol, Square };

/** 难度等级：1=幼兽(新手) 2=游侠(进阶) 3=狮王长老(大师) */
export type Level = 1 | 2 | 3;

/** 让子档位：无 / 让兵 / 让马象 / 让车 */
export type Handicap = 'none' | 'pawn' | 'minor' | 'rook';

/** 玩家阵营：草原族(白/先手) / 苔原族(黑/后手) */
export type Faction = 'savanna' | 'tundra';

/** 说明卡详细度 */
export type TooltipDetail = 'beginner' | 'brief' | 'off';

/** 对局阶段（用于失误率局内递减） */
export type Phase = 'opening' | 'middlegame' | 'endgame';

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw';

export type DrawReason =
  | 'fifty-move'
  | 'repetition'
  | 'insufficient-material'
  | 'agreement';

/** 一步棋的完整记录 */
export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
}

/** 说明卡（§5.5）的唯一数据源，同时供 aria-label 与记谱面板复用 */
export interface PieceInfo {
  code: PieceSymbol;
  animalZh: string;
  animalEn: string;
  emoji: string;
  chessZh: string;
  chessEn: string;
  notation: string; // 兵为空字符串
  valueLabel: string; // 简短价值描述
  moveDesc: string;
  specialAbility?: string;
}

/** AI 请求与响应（主线程 <-> Worker） */
export interface AiRequest {
  id: number;
  fen: string;
  level: Level;
}

export interface AiResponse {
  id: number;
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}
