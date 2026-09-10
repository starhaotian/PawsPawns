import type { Level, Handicap, Phase } from '../types';

/** 失误模型：以"比最优着法差多少厘兵"来定义失误，而不是"排第几名"。 */
export interface BlunderModel {
  /** 触发失误的概率（0~1）。 */
  rate: number;
  /**
   * 失误着法允许的评分损失区间（centipawn）。
   * 下限过滤掉"差不多好"的着法（否则等于没失误），上限避免蠢到离谱。
   */
  lossBand: [number, number];
}

export interface DifficultyConfig {
  level: Level;
  nameZh: string;
  nameEn: string;
  emoji: string;
  /** 迭代深化的最大深度（ply）。实际到达深度还受 budgetMs 约束。 */
  maxDepth: number;
  /** 单步搜索的硬时间预算（ms）。到点即采用最后一个搜完的深度，响应时间因此可控。 */
  budgetMs: number;
  /** 是否展开静态搜索（吃子续算）。关掉会看不清连续吃子，是"新手感"的来源之一。 */
  quiescence: boolean;
  /** 默认失误模型。 */
  blunder: BlunderModel;
  /** 按阶段覆盖失误模型（幼兽档开局更容易走岔）。 */
  blunderByPhase?: Partial<Record<Phase, BlunderModel>>;
  /** 开局库使用的最大步数（ply）；0 表示不使用开局库。 */
  openingPlies: number;
  /** 思考节奏下限范围（ms），让落子不会快到失真。 */
  thinkDelayMs: [number, number];
  tagline: string;
}

export const DIFFICULTIES: Record<Level, DifficultyConfig> = {
  1: {
    level: 1,
    nameZh: '幼兽',
    nameEn: 'Cub',
    emoji: '🐾',
    maxDepth: 2,
    budgetMs: 120,
    quiescence: false,
    blunder: { rate: 0.3, lossBand: [60, 300] },
    blunderByPhase: {
      // 不背开局库，开局最容易走岔；残局稍微收敛，免得把赢棋走成闹剧
      opening: { rate: 0.35, lossBand: [60, 300] },
      middlegame: { rate: 0.3, lossBand: [60, 300] },
      endgame: { rate: 0.22, lossBand: [50, 250] },
    },
    openingPlies: 0,
    thinkDelayMs: [250, 550],
    tagline: '刚学会走路的小家伙，会犯不少可爱的错误',
  },
  2: {
    level: 2,
    nameZh: '游侠',
    nameEn: 'Ranger',
    emoji: '🏹',
    maxDepth: 4,
    budgetMs: 400,
    quiescence: true,
    // 失误区间是个筛选器：区间内没有候选走法时照样走最优，所以放宽上限对平均失误影响有限
    // （实测 14cp → 18cp，题库分辨不出这个量级）。选这组的理由是分布尾巴更长——
    // 偶尔露一个两兵级别的破绽，比持续小幅漂移更符合"偶有疏漏"的定位，也更容易被玩家抓住。
    blunder: { rate: 0.2, lossBand: [40, 220] },
    openingPlies: 8,
    thinkDelayMs: [400, 900],
    tagline: '身经百战的草原游侠，出招稳健，偶有疏漏',
  },
  3: {
    level: 3,
    nameZh: '狮王长老',
    nameEn: 'Elder Lion',
    emoji: '👑',
    maxDepth: 6,
    budgetMs: 700,
    quiescence: true,
    blunder: { rate: 0, lossBand: [0, 0] },
    openingPlies: 10,
    thinkDelayMs: [500, 1000],
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
