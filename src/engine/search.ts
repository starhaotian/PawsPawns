import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import type { Level, Phase } from '../types';
import { DIFFICULTIES } from '../data/difficulty';
import { PIECE_VALUE, relativeEval } from './evaluate';
import { OPENING_BOOK, openingKey } from './openings';

const MATE = 1_000_000;

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

/** 走法排序：优先吃子（MVV-LVA）与升变，提升 alpha-beta 剪枝效率。 */
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
}

function scoreMove(m: Move): number {
  let s = 0;
  if (m.captured) s += 10 * PIECE_VALUE[m.captured] - PIECE_VALUE[m.piece];
  if (m.promotion) s += PIECE_VALUE[m.promotion];
  return s;
}

/** 静态搜索：仅展开吃子，缓解水平线效应，避免"以为白吃了子"。 */
function quiesce(chess: Chess, alpha: number, beta: number): number {
  const standPat = relativeEval(chess, chess.turn());
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = chess.moves({ verbose: true }).filter((m) => m.captured);
  for (const m of orderMoves(captures)) {
    chess.move(m);
    const score = -quiesce(chess, -beta, -alpha);
    chess.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

/** 负极大值（negamax）+ alpha-beta 剪枝。返回当前行棋方视角的分值。 */
function negamax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (chess.isCheckmate()) return -MATE + (10 - depth); // 越早将死越好
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) return 0;
  if (depth === 0) return quiesce(chess, alpha, beta);

  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export interface ScoredMove {
  move: Move;
  score: number;
}

/** 对根节点所有走法评分并按分值降序返回。 */
function scoreRootMoves(chess: Chess, depth: number): ScoredMove[] {
  const moves = orderMoves(chess.moves({ verbose: true }));
  const results: ScoredMove[] = [];
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity);
    chess.undo();
    results.push({ move: m, score });
  }
  return results.sort((a, b) => b.score - a.score);
}

/** 该走法是否会白送子（走后对方能立即净赚该子且我方无足额补偿）。用于失误安全阀。 */
function hangsMaterial(chess: Chess, move: Move): boolean {
  const movedValue = PIECE_VALUE[move.piece];
  chess.move(move);
  // 对手回应中若能吃到刚走的子且我方最佳反吃不足以补偿，视为白送
  const replies = chess.moves({ verbose: true }).filter((r) => r.to === move.to && r.captured);
  let hang = false;
  for (const r of replies) {
    // 若对方用更小或等值的子吃掉我方的子，通常就是净亏
    if (PIECE_VALUE[r.piece] <= movedValue) {
      hang = true;
      break;
    }
  }
  chess.undo();
  // 只对车、后这类重子严格拦截（象/马/兵允许一定战术弃子空间）
  return hang && movedValue >= PIECE_VALUE.r;
}

export interface ChooseResult {
  from: string;
  to: string;
  promotion?: string;
}

/**
 * 为给定局面与难度选择一步棋。
 * 流程：开局库 → 根节点评分 → 按难度注入失误（带安全阀）。
 */
export function chooseMove(fen: string, level: Level): ChooseResult | null {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;

  const cfg = DIFFICULTIES[level];
  const rng = makeRng(seedFromFen(fen));

  // 1) 开局库
  if (cfg.openingPlies > 0 && chess.history().length < cfg.openingPlies) {
    const key = openingKey(fen);
    const book = OPENING_BOOK[key];
    if (book && book.length > 0) {
      const candidates = book.filter((san) => legal.some((m) => m.san === san));
      if (candidates.length > 0) {
        const san = candidates[Math.floor(rng() * candidates.length)];
        const m = legal.find((mv) => mv.san === san)!;
        return { from: m.from, to: m.to, promotion: m.promotion };
      }
    }
  }

  // 2) 搜索评分
  const scored = scoreRootMoves(chess, cfg.searchDepth);
  const bestScore = scored[0].score;

  // 3) 失误注入
  let blunderRate = cfg.blunderBase;
  if (cfg.blunderByPhase) {
    blunderRate = cfg.blunderByPhase[detectPhase(chess)];
  }

  let chosen = scored[0];

  if (blunderRate > 0 && rng() < blunderRate && scored.length > 1) {
    // 从"次优"的走法里挑一个，但受安全阀约束
    const candidates = scored.slice(1).filter((sm) => {
      // 安全阀：绝不自寻将死、绝不白送车/后、绝不无视将军
      if (sm.score <= -MATE + 50) return false; // 会被将死
      if (hangsMaterial(chess, sm.move)) return false; // 白送重子
      return true;
    });
    if (candidates.length > 0) {
      // 偏向挑分差不太夸张的次优步，避免蠢到离谱
      const pick = candidates[Math.floor(rng() * Math.min(candidates.length, 3))];
      if (pick) chosen = pick;
    }
  }

  // 最终兜底：若因浮点/边界导致 chosen 非法，退回最优步
  const m = chosen?.move ?? scored[0].move;
  void bestScore;
  return { from: m.from, to: m.to, promotion: m.promotion };
}
