import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import type { Level, Phase } from '../types';
import { DIFFICULTIES } from '../data/difficulty';
import type { BlunderModel, DifficultyConfig } from '../data/difficulty';
import { PIECE_VALUE, relativeEval } from './evaluate';
import { OPENING_BOOK, openingKey } from './openings';

const MATE = 1_000_000;
/** 静态搜索最多再展开几层吃子，防止在乱战局面里指数爆炸。 */
const QUIESCE_MAX_PLY = 4;
/** delta 剪枝余量：连"吃到的子 + 余量"都追不上 alpha，就不必算了。 */
const DELTA_MARGIN = 200;

/** 超时中止哨兵：抛出后丢弃当前这层未完成的结果，沿用上一层。 */
const ABORT = { aborted: true } as const;

/** 确定性 RNG（mulberry32），以局面哈希做种，保证同一局面/悔棋不会重掷失误骰子。 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 从 FEN 生成一个稳定的 32 位种子。 */
export function seedFromFen(fen: string): number {
  let h = 2166136261;
  for (let i = 0; i < fen.length; i++) {
    h ^= fen.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 判断当前对局阶段：按双方非兵子力总数粗略划分。 */
function detectPhase(chess: Chess): Phase {
  const board = chess.board();
  let majorMinor = 0;
  let queens = 0;
  for (const row of board) {
    for (const p of row) {
      if (!p) continue;
      if (p.type === 'q') queens++;
      if (p.type === 'r' || p.type === 'b' || p.type === 'n') majorMinor++;
    }
  }
  if (chess.moveNumber() <= 8) return 'opening';
  if (queens === 0 || majorMinor <= 4) return 'endgame';
  return 'middlegame';
}

/** 从 FEN 推算已走步数（ply）。注意 new Chess(fen) 的 history() 是空的，不能用它计数。 */
function pliesFromFen(fen: string): number {
  const parts = fen.split(' ');
  const moveNumber = Number(parts[5] ?? '1') || 1;
  return (moveNumber - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}

type TTFlag = 'exact' | 'lower' | 'upper';

interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
  best?: string;
}

interface SearchCtx {
  nodes: number;
  deadline: number;
  /** 第 1 层不可中止，保证任何时候都有一份完整的根节点评分表。 */
  abortable: boolean;
  quiescence: boolean;
  tt: Map<string, TTEntry>;
}

/** 置换表键：FEN 的前四段（布局/行棋方/易位权/吃过路兵），忽略回合计数。 */
function ttKey(chess: Chess): string {
  const parts = chess.fen().split(' ');
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

function moveKey(m: Move): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

function checkTime(ctx: SearchCtx): void {
  ctx.nodes++;
  // chess.js 单节点开销较大（约 0.1~0.7ms），检查间隔必须足够小，否则会大幅超支预算。
  if (ctx.abortable && (ctx.nodes & 127) === 0 && Date.now() > ctx.deadline) {
    throw ABORT;
  }
}

function scoreMove(m: Move): number {
  let s = 0;
  if (m.captured) s += 10 * PIECE_VALUE[m.captured] - PIECE_VALUE[m.piece];
  if (m.promotion) s += PIECE_VALUE[m.promotion];
  return s;
}

/** 走法排序：置换表中的最佳着法优先，其次吃子（MVV-LVA）与升变。 */
function orderMoves(moves: Move[], preferred?: string): Move[] {
  const sorted = [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
  if (!preferred) return sorted;
  const i = sorted.findIndex((m) => moveKey(m) === preferred);
  if (i > 0) {
    const [hit] = sorted.splice(i, 1);
    sorted.unshift(hit);
  }
  return sorted;
}

/**
 * 静态搜索：仅展开吃子，缓解水平线效应；有深度上限与 delta 剪枝。
 * 被将军时例外——必须搜索全部合法走法，且不能静态截断，否则会把"正在被将"当成安定局面。
 */
function quiesce(
  chess: Chess,
  alpha: number,
  beta: number,
  qply: number,
  ply: number,
  ctx: SearchCtx,
): number {
  checkTime(ctx);
  const standPat = relativeEval(chess, chess.turn());
  if (qply >= QUIESCE_MAX_PLY) return standPat;

  const inCheck = chess.isCheck();
  if (!inCheck) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  }

  const all = chess.moves({ verbose: true }) as Move[];
  if (inCheck && all.length === 0) return -MATE + ply;
  const candidates = inCheck ? all : all.filter((m) => m.captured);

  for (const m of orderMoves(candidates)) {
    // 被将军时不能剪枝：任何一步都可能是唯一解将手段。
    if (!inCheck && standPat + PIECE_VALUE[m.captured!] + DELTA_MARGIN < alpha) continue;
    chess.move(m);
    const score = -quiesce(chess, -beta, -alpha, qply + 1, ply + 1, ctx);
    chess.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/** 负极大值（negamax）+ alpha-beta + 置换表。返回当前行棋方视角的分值。 */
function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  ctx: SearchCtx,
): number {
  checkTime(ctx);

  const moves = chess.moves({ verbose: true }) as Move[];
  // 无合法走法：被将军=被将死（越晚越好），否则逼和。比 isCheckmate() 便宜。
  if (moves.length === 0) return chess.isCheck() ? -MATE + ply : 0;
  // 和棋判定要回放棋谱，非常昂贵；只在根节点的直接子节点检查——
  // 这一层才决定"会不会主动走进和棋"，更深处的影响可忽略。
  if (ply === 1 && (chess.isThreefoldRepetition() || chess.isDraw())) return 0;

  if (depth <= 0) {
    return ctx.quiescence
      ? quiesce(chess, alpha, beta, 0, ply, ctx)
      : relativeEval(chess, chess.turn());
  }

  const key = ttKey(chess);
  const hit = ctx.tt.get(key);
  if (hit && hit.depth >= depth) {
    if (hit.flag === 'exact') return hit.score;
    if (hit.flag === 'lower' && hit.score > alpha) alpha = hit.score;
    else if (hit.flag === 'upper' && hit.score < beta) beta = hit.score;
    if (alpha >= beta) return hit.score;
  }

  const alphaOrig = alpha;
  let best = -Infinity;
  let bestMove: string | undefined;
  for (const m of orderMoves(moves, hit?.best)) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, ctx);
    chess.undo();
    if (score > best) {
      best = score;
      bestMove = moveKey(m);
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  // 将死分含"到根节点的距离"，而置换表键只有局面，跨路径复用会算错杀棋步数——干脆不存。
  if (Math.abs(best) < MATE - 1000) {
    const flag: TTFlag = best <= alphaOrig ? 'upper' : best >= beta ? 'lower' : 'exact';
    ctx.tt.set(key, { depth, score: best, flag, best: bestMove });
  }
  return best;
}

export interface ScoredMove {
  move: Move;
  score: number;
}

/**
 * 迭代深化：逐层加深，每层都算出**完整**的根节点评分表。
 * 时间到就丢弃未完成的那层，沿用上一层的结果——单步耗时因此有硬上限。
 * wideScores=true 时根节点不做 alpha 收窄，保证每个走法都有可比的真实分（失误模型需要）。
 */
function searchRoot(chess: Chess, cfg: DifficultyConfig, wideScores: boolean): ScoredMove[] {
  const ctx: SearchCtx = {
    nodes: 0,
    deadline: Date.now() + cfg.budgetMs,
    abortable: false,
    quiescence: cfg.quiescence,
    tt: new Map(),
  };

  let ordered = orderMoves(chess.moves({ verbose: true }) as Move[]);
  let result: ScoredMove[] = [];
  const baseHistory = chess.history().length;

  for (let depth = 1; depth <= cfg.maxDepth; depth++) {
    ctx.abortable = depth > 1; // 第 1 层必须跑完
    try {
      const scored: ScoredMove[] = [];
      let alpha = -Infinity;
      for (const m of ordered) {
        chess.move(m);
        // 根节点 beta 恒为 +∞，故子节点窗口是 (-∞, -alpha)；满窗口时 -alpha 即 +∞。
        const childBeta = wideScores ? Infinity : -alpha;
        const score = -negamax(chess, depth - 1, -Infinity, childBeta, 1, ctx);
        chess.undo();
        scored.push({ move: m, score });
        if (!wideScores && score > alpha) alpha = score;
      }
      scored.sort((a, b) => b.score - a.score);
      result = scored;
      ordered = scored.map((s) => s.move); // 下一层沿用本层排序，剪枝更有效
    } catch (e) {
      // 抛出中断时栈上的走子都还没撤销，必须手动回退到进入时的局面。
      while (chess.history().length > baseHistory) chess.undo();
      if (e === ABORT) break;
      throw e;
    }
    if (Date.now() > ctx.deadline) break;
    if (result[0] && result[0].score >= MATE - 100) break; // 已找到必胜杀法
  }

  return result;
}

/** 按失误模型挑一步"差得刚好"的走法；区间内无候选则返回 null（照常走最优）。 */
function pickBlunder(
  scored: ScoredMove[],
  model: BlunderModel,
  rng: () => number,
): ScoredMove | null {
  if (scored.length < 2) return null;
  const bestScore = scored[0].score;
  const [lo, hi] = model.lossBand;
  const band = scored.slice(1).filter((sm) => {
    if (sm.score <= -MATE + 100) return false; // 唯一底线：不主动走进被将杀
    const loss = bestScore - sm.score;
    return loss >= lo && loss <= hi;
  });
  if (band.length === 0) return null;
  return band[Math.floor(rng() * band.length)];
}

export interface ChooseResult {
  from: string;
  to: string;
  promotion?: string;
}

/**
 * 为给定局面与难度选择一步棋。
 * 流程：开局库 → 迭代深化评分 → 按难度与阶段注入失误。
 * gameSeed 让不同对局的随机性不同，同时同一局面重复请求仍然稳定（悔棋不会重掷）。
 */
export function chooseMove(fen: string, level: Level, gameSeed = 0): ChooseResult | null {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true }) as Move[];
  if (legal.length === 0) return null;

  const cfg = DIFFICULTIES[level];
  const rng = makeRng((seedFromFen(fen) ^ gameSeed) >>> 0);

  // 1) 开局库
  if (cfg.openingPlies > 0 && pliesFromFen(fen) < cfg.openingPlies) {
    const book = OPENING_BOOK[openingKey(fen)];
    if (book && book.length > 0) {
      const candidates = book.filter((san) => legal.some((m) => m.san === san));
      if (candidates.length > 0) {
        const san = candidates[Math.floor(rng() * candidates.length)];
        const m = legal.find((mv) => mv.san === san)!;
        return { from: m.from, to: m.to, promotion: m.promotion };
      }
    }
  }

  // 2) 搜索评分（失误率为 0 的档位不需要全部走法的真实分，可用窗口收窄加速）
  const model: BlunderModel = cfg.blunderByPhase?.[detectPhase(chess)] ?? cfg.blunder;
  const scored = searchRoot(chess, cfg, model.rate > 0);
  if (scored.length === 0) {
    const m = legal[0];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }

  // 3) 失误注入
  let chosen = scored[0];
  if (model.rate > 0 && rng() < model.rate) {
    const slip = pickBlunder(scored, model, rng);
    if (slip) chosen = slip;
  }

  const m = chosen.move;
  return { from: m.from, to: m.to, promotion: m.promotion };
}
