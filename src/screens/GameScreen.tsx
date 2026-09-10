import { Board } from '../components/Board';
import { PromotionDialog } from '../components/PromotionDialog';
import { AnimalPiece } from '../components/AnimalPiece';
import { useGameStore } from '../store/gameStore';
import { DIFFICULTIES } from '../data/difficulty';
import { COPY } from '../data/copy';
import { PIECE_VALUE } from '../engine/evaluate';
import type { PieceSymbol, Color } from '../types';

/** 对局页：棋盘 + 状态条 + 棋谱 + 战利品 + 操作按钮。 */
export function GameScreen() {
  const history = useGameStore((s) => s.history);
  const captured = useGameStore((s) => s.captured);
  const status = useGameStore((s) => s.status);
  const aiThinking = useGameStore((s) => s.aiThinking);
  const settings = useGameStore((s) => s.settings);
  const chess = useGameStore((s) => s.chess);
  const undo = useGameStore((s) => s.undo);
  const requestHint = useGameStore((s) => s.requestHint);
  const resign = useGameStore((s) => s.resign);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const playerColor: Color = settings.faction === 'savanna' ? 'w' : 'b';
  const isPlayerTurn = chess.turn() === playerColor && !aiThinking;
  const diff = DIFFICULTIES[settings.level];

  const statusText = aiThinking
    ? COPY.game.aiThinking
    : status === 'check'
      ? COPY.game.check
      : isPlayerTurn
        ? COPY.game.yourTurn
        : COPY.game.aiThinking;

  return (
    <div className="game-layout">
      <div className="board-column">
        <div className={`status-bar ${status === 'check' ? 'alarm' : ''}`}>
          <span className="status-opponent">
            {diff.emoji} 对手：{diff.nameZh}
          </span>
          <span className="status-turn">
            {aiThinking && <span className="spinner" />}
            {statusText}
          </span>
        </div>
        <Board />
        <div className="controls">
          <button className="btn" onClick={undo} disabled={aiThinking || history.length === 0}>
            ↩ {COPY.game.undo}
          </button>
          <button className="btn" onClick={requestHint} disabled={!isPlayerTurn}>
            💡 {COPY.game.hint}
          </button>
          <button className="btn" onClick={flipBoard}>
            🔄 {COPY.game.flipBoard}
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm(COPY.confirm.resign)) resign();
            }}
          >
            🏳 {COPY.game.resign}
          </button>
          <button className="btn" onClick={backToMenu}>
            ☰ {COPY.game.backToMenu}
          </button>
        </div>
      </div>

      <aside className="side-panel">
        <CapturedTray captured={captured} playerColor={playerColor} />
        <div className="moves-panel">
          <h3>{COPY.game.moves}</h3>
          <MoveList history={history} />
        </div>
      </aside>

      <PromotionDialog />
    </div>
  );
}

function CapturedTray({
  captured,
  playerColor,
}: {
  captured: { w: PieceSymbol[]; b: PieceSymbol[] };
  playerColor: Color;
}) {
  const oppColor: Color = playerColor === 'w' ? 'b' : 'w';
  // 玩家吃掉的是对手颜色的子；对手吃掉的是玩家颜色的子
  const playerGains = captured[oppColor];
  const aiGains = captured[playerColor];
  const score = materialScore(playerGains) - materialScore(aiGains);

  return (
    <div className="captured-tray">
      <div className="captured-row">
        <span className="captured-label">你的战利品</span>
        <div className="captured-pieces">
          {playerGains.map((p, i) => (
            <AnimalPiece key={i} type={p} color={oppColor} size={26} />
          ))}
          {score > 0 && <span className="advantage">+{score}</span>}
        </div>
      </div>
      <div className="captured-row">
        <span className="captured-label">对手战利品</span>
        <div className="captured-pieces">
          {aiGains.map((p, i) => (
            <AnimalPiece key={i} type={p} color={playerColor} size={26} />
          ))}
          {score < 0 && <span className="advantage">+{-score}</span>}
        </div>
      </div>
    </div>
  );
}

function materialScore(pieces: PieceSymbol[]): number {
  return pieces.reduce((sum, p) => sum + Math.round(PIECE_VALUE[p] / 100), 0);
}

function MoveList({ history }: { history: { san: string }[] }) {
  // 两步一行（白/黑）
  const rows: { no: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      no: i / 2 + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }
  return (
    <ol className="move-list">
      {rows.length === 0 && <li className="move-empty">还没有落子</li>}
      {rows.map((r) => (
        <li key={r.no}>
          <span className="move-no">{r.no}.</span>
          <span className="move-san">{r.white}</span>
          <span className="move-san">{r.black ?? ''}</span>
        </li>
      ))}
    </ol>
  );
}
