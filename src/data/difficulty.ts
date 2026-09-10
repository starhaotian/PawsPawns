import type { Level, Handicap } from '../types';

export interface DifficultyConfig {
  level: Level;
  nameZh: string;
  nameEn: string;
  emoji: string;
  /** 搜索深度（半步/ply）。受限于纯 JS 引擎的可行性，大师档封顶在可实时返回的深度。 */
  searchDepth: number;
  /** 基础失误率（0~1）。幼兽档会按局面阶段递减。 */
  blunderBase: number;
  /** 幼兽档专用：按阶段递减的失误率。其余档位读 blunderBase。 */
  blunderByPhase?: { opening: number; middlegame: number; endgame: number };
  /** 开局库使用的最大步数（ply）；0 表示不使用开局库。 */
  openingPlies: number;
  /** 思考时的模拟延迟范围（ms），让节奏更自然。 */
  thinkDelayMs: [number, number];
  tagline: string;
}

export const DIFFICULTIES: Record<Level, DifficultyConfig> = {
  1: {
    level: 1,
    nameZh: '幼兽',
    nameEn: 'Cub',
    emoji: '🐾',
    searchDepth: 2,
    blunderBase: 0.45,
    blunderByPhase: { opening: 0.55, middlegame: 0.45, endgame: 0.3 },
    openingPlies: 0,
    thinkDelayMs: [300, 700],
    tagline: '刚学会走路的小家伙，会犯不少可爱的错误',
  },
  2: {
    level: 2,
    nameZh: '游侠',
    nameEn: 'Ranger',
    emoji: '🏹',
    searchDepth: 3,
    blunderBase: 0.12,
    openingPlies: 6,
    thinkDelayMs: [500, 1100],
    tagline: '身经百战的草原游侠，出招稳健，偶有疏漏',
  },
  3: {
    level: 3,
    nameZh: '狮王长老',
    nameEn: 'Elder Lion',
    emoji: '👑',
    searchDepth: 4,
    blunderBase: 0,
    openingPlies: 12,
    thinkDelayMs: [700, 1500],
    tagline: '统治百兽王国的智者，几乎不会给你机会',
  },
};

export interface HandicapConfig {
  id: Handicap;
  nameZh: string;
  desc: string;
  /** 需要从 AI（黑方）初始阵型中移除的棋子所在格。空数组=标准开局。 */
  removeSquares: string[];
}

/**
 * 让子通过修改初始 FEN 实现：从 AI（默认执黑，后手）阵营移除若干棋子。
 * 玩家默认执白（先手，草原族）。
 */
export const HANDICAPS: Record<Handicap, HandicapConfig> = {
  none: { id: 'none', nameZh: '公平对局', desc: '双方棋子完全对等', removeSquares: [] },
  pawn: { id: 'pawn', nameZh: '让一兵', desc: '对手少一个兵，非常轻微的优势', removeSquares: ['d7'] },
  minor: {
    id: 'minor',
    nameZh: '让一马/象',
    desc: '对手少一个轻子（袋鼠），明显优势',
    removeSquares: ['b8'],
  },
  rook: {
    id: 'rook',
    nameZh: '让一车',
    desc: '对手少一头大象（车），巨大优势',
    removeSquares: ['a8'],
  },
};

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** 标准棋盘各格的棋子（用于按格移除后重建 FEN）。 */
function boardFromFen(fen: string): (string | null)[][] {
  const rows = fen.split(' ')[0].split('/');
  return rows.map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function squareToIndex(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0); // 0..7 列
  const rank = 8 - Number(sq[1]); // 0..7 行（从第 8 行开始）
  return [rank, file];
}

function boardToFenPlacement(board: (string | null)[][]): string {
  return board
    .map((row) => {
      let out = '';
      let empty = 0;
      for (const cell of row) {
        if (cell === null) {
          empty++;
        } else {
          if (empty > 0) {
            out += empty;
            empty = 0;
          }
          out += cell;
        }
      }
      if (empty > 0) out += empty;
      return out;
    })
    .join('/');
}

/** 根据让子档位生成初始 FEN。none 直接返回标准局面。 */
export function buildInitialFen(handicap: Handicap): string {
  const cfg = HANDICAPS[handicap];
  if (cfg.removeSquares.length === 0) return STANDARD_FEN;
  const board = boardFromFen(STANDARD_FEN);
  for (const sq of cfg.removeSquares) {
    const [r, f] = squareToIndex(sq);
    board[r][f] = null;
  }
  // 让子后 castling 权可能失效（如让 a8 车），交给 chess.js 加载时校正。
  const placement = boardToFenPlacement(board);
  // 让子局面禁止让 AI 借此声明可易位而报错，这里保守地移除受影响的黑方易位权。
  let castling = 'KQkq';
  if (cfg.removeSquares.includes('a8')) castling = castling.replace('q', '');
  if (cfg.removeSquares.includes('h8')) castling = castling.replace('k', '');
  if (castling === '') castling = '-';
  return `${placement} w ${castling} - 0 1`;
}
