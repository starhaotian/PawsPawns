import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { Move, Square } from 'chess.js';
import type {
  Level,
  Handicap,
  Faction,
  TooltipDetail,
  GameStatus,
  DrawReason,
  MoveRecord,
  PieceSymbol,
} from '../types';
import { buildInitialFen } from '../data/difficulty';
import { getAiClient } from '../engine/aiClient';

export type Screen = 'menu' | 'game' | 'result';

interface PendingPromotion {
  from: Square;
  to: Square;
}

interface GameSettings {
  level: Level;
  handicap: Handicap;
  faction: Faction;
  tooltipDetail: TooltipDetail;
}

interface GameState {
  screen: Screen;
  settings: GameSettings;

  // 棋局
  chess: Chess;
  fen: string;
  history: MoveRecord[];
  status: GameStatus;
  drawReason?: DrawReason;
  winner?: Faction | 'draw';

  // 交互
  selected: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  orientation: Faction; // 棋盘视角（底部阵营）
  aiThinking: boolean;
  pendingPromotion: PendingPromotion | null;
  hintMove: { from: Square; to: Square } | null;
  hintsLeft: number;
  captured: { w: PieceSymbol[]; b: PieceSymbol[] };
  resigned: boolean;

  // actions
  setScreen: (s: Screen) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  startGame: () => void;
  resumeGame: () => void;
  selectSquare: (sq: Square) => void;
  clearSelection: () => void;
  tryMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  resolvePromotion: (piece: PieceSymbol) => void;
  cancelPromotion: () => void;
  triggerAiIfNeeded: () => void;
  undo: () => void;
  requestHint: () => Promise<void>;
  resign: () => void;
  flipBoard: () => void;
  backToMenu: () => void;
}

/** 玩家所执颜色：草原族=白，苔原族=黑。 */
function playerColor(faction: Faction): 'w' | 'b' {
  return faction === 'savanna' ? 'w' : 'b';
}

function aiColor(faction: Faction): 'w' | 'b' {
  return playerColor(faction) === 'w' ? 'b' : 'w';
}

function factionOfColor(color: 'w' | 'b'): Faction {
  return color === 'w' ? 'savanna' : 'tundra';
}

/** 从 chess 实例读出当前对局状态。 */
function readStatus(chess: Chess): { status: GameStatus; drawReason?: DrawReason } {
  if (chess.isCheckmate()) return { status: 'checkmate' };
  if (chess.isStalemate()) return { status: 'stalemate' };
  if (chess.isInsufficientMaterial())
    return { status: 'draw', drawReason: 'insufficient-material' };
  if (chess.isThreefoldRepetition()) return { status: 'draw', drawReason: 'repetition' };
  if (chess.isDraw()) return { status: 'draw', drawReason: 'fifty-move' };
  if (chess.isCheck()) return { status: 'check' };
  return { status: 'playing' };
}

/** 依据棋谱统计被吃掉的棋子（按被吃方颜色归类）。 */
function computeCaptured(history: MoveRecord[]): { w: PieceSymbol[]; b: PieceSymbol[] } {
  const result: { w: PieceSymbol[]; b: PieceSymbol[] } = { w: [], b: [] };
  for (const m of history) {
    if (m.captured) {
      // 被吃的一方与走子方相反
      const victimColor = m.color === 'w' ? 'b' : 'w';
      result[victimColor].push(m.captured);
    }
  }
  return result;
}

/** 每局提示（智慧之光）的可用次数上限。 */
export const MAX_HINTS = 3;

const SAVE_KEY = 'paws-and-pawns:save';

interface SaveData {
  settings: GameSettings;
  fen: string;
  pgn: string;
  orientation: Faction;
  hintsLeft: number;
}

function persist(state: GameState) {
  try {
    const data: SaveData = {
      settings: state.settings,
      fen: state.fen,
      pgn: state.chess.pgn(),
      orientation: state.orientation,
      hintsLeft: state.hintsLeft,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* noop */
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'menu',
  settings: {
    level: 1,
    handicap: 'none',
    faction: 'savanna',
    tooltipDetail: 'beginner',
  },

  chess: new Chess(),
  fen: new Chess().fen(),
  history: [],
  status: 'playing',
  winner: undefined,

  selected: null,
  legalTargets: [],
  lastMove: null,
  orientation: 'savanna',
  aiThinking: false,
  pendingPromotion: null,
  hintMove: null,
  hintsLeft: MAX_HINTS,
  captured: { w: [], b: [] },
  resigned: false,

  setScreen: (screen) => set({ screen }),

  updateSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),

  startGame: () => {
    const { settings } = get();
    const chess = new Chess(buildInitialFen(settings.handicap));
    set({
      chess,
      fen: chess.fen(),
      history: [],
      status: readStatus(chess).status,
      drawReason: undefined,
      winner: undefined,
      selected: null,
      legalTargets: [],
      lastMove: null,
      orientation: settings.faction,
      aiThinking: false,
      pendingPromotion: null,
      hintMove: null,
      hintsLeft: MAX_HINTS,
      captured: { w: [], b: [] },
      resigned: false,
      screen: 'game',
    });
    persist(get());
    // 若玩家执黑，AI（白）先走
    get().triggerAiIfNeeded();
  },

  resumeGame: () => {
    const saved = loadSave();
    if (!saved) return;
    const chess = new Chess();
    // 优先用 PGN 复盘（保留完整步数，可继续悔棋）；
    // 让子等非标准开局的 PGN 可能无法还原，则回退到直接加载当前 FEN。
    let restored = false;
    try {
      chess.loadPgn(saved.pgn);
      restored = chess.fen() === saved.fen;
    } catch {
      restored = false;
    }
    if (!restored) {
      const fallback = new Chess();
      try {
        fallback.load(saved.fen);
        return void resumeFrom(set, get, saved, fallback);
      } catch {
        return; // 存档损坏，放弃恢复
      }
    }
    resumeFrom(set, get, saved, chess);
  },

  selectSquare: (sq) => {
    const { chess, settings, selected, aiThinking, pendingPromotion } = get();
    if (aiThinking || pendingPromotion) return;
    // 只允许玩家在自己回合操作
    if (chess.turn() !== playerColor(settings.faction)) return;

    const piece = chess.get(sq);

    // 已选中且点了合法目标 → 走子
    if (selected) {
      const targets = get().legalTargets;
      if (targets.includes(sq)) {
        get().tryMove(selected, sq);
        return;
      }
    }

    // 选中自己的棋子 → 高亮其合法走法
    if (piece && piece.color === playerColor(settings.faction)) {
      const moves = chess.moves({ square: sq, verbose: true }) as Move[];
      set({
        selected: sq,
        legalTargets: moves.map((m) => m.to),
        hintMove: null,
      });
    } else {
      set({ selected: null, legalTargets: [] });
    }
  },

  clearSelection: () => set({ selected: null, legalTargets: [] }),

  tryMove: (from, to, promotion) => {
    const { chess } = get();
    const piece = chess.get(from);
    // 需要升变但未指定目标 → 弹出升变选择
    if (
      piece?.type === 'p' &&
      !promotion &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
    ) {
      set({ pendingPromotion: { from, to }, selected: null, legalTargets: [] });
      return false;
    }

    let move: Move | null = null;
    try {
      move = chess.move({ from, to, promotion: promotion ?? undefined });
    } catch {
      move = null;
    }
    if (!move) {
      set({ selected: null, legalTargets: [] });
      return false;
    }

    const record: MoveRecord = {
      san: move.san,
      from: move.from,
      to: move.to,
      color: move.color,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
    };
    const history = [...get().history, record];
    const { status, drawReason } = readStatus(chess);
    set({
      fen: chess.fen(),
      history,
      status,
      drawReason,
      selected: null,
      legalTargets: [],
      lastMove: { from: move.from, to: move.to },
      hintMove: null,
      captured: computeCaptured(history),
    });
    persist(get());

    if (status === 'checkmate' || status === 'stalemate' || status === 'draw') {
      finishGame(set, get);
      return true;
    }
    get().triggerAiIfNeeded();
    return true;
  },

  resolvePromotion: (pieceType) => {
    const { pendingPromotion } = get();
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    set({ pendingPromotion: null });
    get().tryMove(from, to, pieceType);
  },

  cancelPromotion: () => set({ pendingPromotion: null }),

  triggerAiIfNeeded: () => {
    const { chess, settings, status } = get();
    if (status === 'checkmate' || status === 'stalemate' || status === 'draw') return;
    if (chess.turn() !== aiColor(settings.faction)) return;

    set({ aiThinking: true });
    const fen = chess.fen();
    getAiClient()
      .requestMove(fen, settings.level)
      .then((res) => {
        const cur = get();
        // 防止在等待期间局面已变化（如返回菜单）
        if (cur.chess.fen() !== fen) {
          set({ aiThinking: false });
          return;
        }
        let move: Move | null = null;
        try {
          move = cur.chess.move({
            from: res.from,
            to: res.to,
            promotion: res.promotion ?? 'q',
          });
        } catch {
          move = null;
        }
        if (!move) {
          set({ aiThinking: false });
          return;
        }
        const record: MoveRecord = {
          san: move.san,
          from: move.from,
          to: move.to,
          color: move.color,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
        };
        const history = [...cur.history, record];
        const { status: st, drawReason } = readStatus(cur.chess);
        set({
          fen: cur.chess.fen(),
          history,
          status: st,
          drawReason,
          lastMove: { from: move.from, to: move.to },
          aiThinking: false,
          captured: computeCaptured(history),
        });
        persist(get());
        if (st === 'checkmate' || st === 'stalemate' || st === 'draw') {
          finishGame(set, get);
        }
      })
      .catch(() => set({ aiThinking: false }));
  },

  undo: () => {
    const { chess, settings, aiThinking } = get();
    if (aiThinking) return;
    // 撤销到玩家上一次落子之前：通常撤两步（AI + 玩家）
    const undone1 = chess.undo(); // 撤销 AI 的一步
    if (undone1 && chess.turn() !== playerColor(settings.faction)) {
      chess.undo(); // 再撤销玩家自己的一步
    } else if (!undone1) {
      return;
    }
    const history = chess.history({ verbose: true }).map(
      (m): MoveRecord => ({
        san: m.san,
        from: m.from,
        to: m.to,
        color: m.color,
        piece: m.piece,
        captured: m.captured,
        promotion: m.promotion,
      }),
    );
    const { status, drawReason } = readStatus(chess);
    const last = history[history.length - 1];
    set({
      fen: chess.fen(),
      history,
      status,
      drawReason,
      selected: null,
      legalTargets: [],
      hintMove: null,
      lastMove: last ? { from: last.from, to: last.to } : null,
      captured: computeCaptured(history),
      winner: undefined,
      screen: 'game',
    });
    persist(get());
  },

  requestHint: async () => {
    const { chess, settings, aiThinking, hintsLeft } = get();
    if (aiThinking || hintsLeft <= 0) return;
    if (chess.turn() !== playerColor(settings.faction)) return;
    const fen = chess.fen();
    // 提示强度跟随当前难度：给出与对手同级的着法，而非永远最优解
    set({ hintsLeft: hintsLeft - 1 });
    persist(get());
    const res = await getAiClient().requestMove(fen, settings.level);
    if (get().chess.fen() !== fen) return;
    set({ hintMove: { from: res.from, to: res.to } });
  },

  resign: () => {
    const { settings } = get();
    set({
      status: 'checkmate',
      winner: factionOfColor(aiColor(settings.faction)),
      resigned: true,
      screen: 'result',
    });
    clearSave();
  },

  flipBoard: () =>
    set((s) => ({
      orientation: s.orientation === 'savanna' ? 'tundra' : 'savanna',
    })),

  backToMenu: () => set({ screen: 'menu' }),
}));

/** 从已恢复的 chess 实例重建对局状态并切到对局页。 */
function resumeFrom(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  saved: { settings: GameSettings; orientation: Faction; hintsLeft: number },
  chess: Chess,
) {
  const history = chess.history({ verbose: true }).map(
    (m): MoveRecord => ({
      san: m.san,
      from: m.from,
      to: m.to,
      color: m.color,
      piece: m.piece,
      captured: m.captured,
      promotion: m.promotion,
    }),
  );
  const { status, drawReason } = readStatus(chess);
  const last = history[history.length - 1];
  set({
    settings: saved.settings,
    chess,
    fen: chess.fen(),
    history,
    status,
    drawReason,
    selected: null,
    legalTargets: [],
    lastMove: last ? { from: last.from, to: last.to } : null,
    hintMove: null,
    hintsLeft: saved.hintsLeft,
    orientation: saved.orientation,
    aiThinking: false,
    pendingPromotion: null,
    captured: computeCaptured(history),
    resigned: false,
    winner: undefined,
    screen: 'game',
  });
  persist(get());
  get().triggerAiIfNeeded();
}

/** 结算：根据 chess 状态确定胜负，切到结算页。 */
function finishGame(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
) {
  const { chess, status } = get();
  let winner: Faction | 'draw';
  if (status === 'checkmate') {
    // 被将死的是当前行棋方 → 对方获胜
    const loserColor = chess.turn();
    winner = factionOfColor(loserColor === 'w' ? 'b' : 'w');
  } else {
    winner = 'draw';
  }
  set({ winner, screen: 'result' });
  clearSave();
}
