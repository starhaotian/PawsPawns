import { useState } from 'react';
import { Board } from '../components/Board';
import { PromotionDialog } from '../components/PromotionDialog';
import { AnimalPiece } from '../components/AnimalPiece';
import { useGameStore } from '../store/gameStore';
import { DIFFICULTIES } from '../data/difficulty';
import { COPY } from '../data/copy';
import { PIECE_INFO, PROMOTION_CHOICES } from '../data/pieceMap';
import { PIECE_VALUE } from '../engine/evaluate';
import type { PieceSymbol, Color } from '../types';

const MAX_HINTS = 3;

/** 对局页：还原概念稿——顶部对战信息条 + 木质棋盘 + 底部圆润操作栏。 */
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

  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [showRules, setShowRules] = useState(false);

  const playerColor: Color = settings.faction === 'savanna' ? 'w' : 'b';
  const oppColor: Color = playerColor === 'w' ? 'b' : 'w';
  const isPlayerTurn = chess.turn() === playerColor && !aiThinking;
  const diff = DIFFICULTIES[settings.level];

  const statusText = aiThinking
    ? COPY.game.aiThinking
    : status === 'check'
      ? COPY.game.check
      : isPlayerTurn
        ? COPY.game.yourTurn
        : COPY.game.aiThinking;

  const playerGains = captured[oppColor];
  const aiGains = captured[playerColor];
  const score = materialScore(playerGains) - materialScore(aiGains);

  const doHint = () => {
    if (!isPlayerTurn || hintsLeft <= 0) return;
    requestHint();
    setHintsLeft((n) => n - 1);
  };

  return (
    <div className="game-screen">
      {/* 顶部对战信息条 */}
      <header className="top-bar">
        <button className="icon-btn" onClick={backToMenu} aria-label={COPY.game.backToMenu} title={COPY.game.backToMenu}>
          <span className="icon-glyph">←</span>
        </button>

        <div className={`player-card savanna ${isPlayerTurn ? 'active' : ''}`}>
          <div className="avatar">
            <AnimalPiece type="k" color="w" size={44} />
          </div>
          <div className="player-info">
            <span className="player-name">你</span>
            <span className="player-meta">🏆 草原族</span>
            <CapturedRow pieces={playerGains} color={oppColor} bonus={score > 0 ? score : 0} />
          </div>
        </div>

        <div className={`turn-pill ${status === 'check' ? 'alarm' : ''}`}>
          {aiThinking ? <span className="spinner" /> : <span className="crown">👑</span>}
          <span>{statusText}</span>
        </div>

        <div className={`player-card tundra ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="player-info right">
            <span className="player-name">{diff.nameZh}</span>
            <span className="player-meta">🏆 Lv.{settings.level}</span>
            <CapturedRow pieces={aiGains} color={playerColor} bonus={score < 0 ? -score : 0} align="right" />
          </div>
          <div className="avatar">
            <AnimalPiece type="k" color="b" size={44} />
          </div>
        </div>

        <button className="icon-btn" onClick={flipBoard} aria-label={COPY.game.flipBoard} title={COPY.game.flipBoard}>
          <span className="icon-glyph">⇅</span>
        </button>
      </header>

      <Board />

      {/* 底部操作栏 */}
      <footer className="bottom-bar">
        <button
          className="ctrl-btn"
          onClick={undo}
          disabled={aiThinking || history.length === 0}
        >
          <span className="ctrl-icon">↩</span>
          <span className="ctrl-label">{COPY.game.undo}</span>
        </button>

        <button className="ctrl-btn" onClick={doHint} disabled={!isPlayerTurn || hintsLeft <= 0}>
          <span className="ctrl-icon">💡</span>
          {hintsLeft > 0 && <span className="badge">{hintsLeft}</span>}
          <span className="ctrl-label">{COPY.game.hint}</span>
        </button>

        <div className="status-card">
          <AnimalPiece type="p" color={playerColor} size={40} />
          <span className="status-card-text">{statusText}</span>
        </div>

        <button className="ctrl-btn" onClick={() => setShowRules(true)}>
          <span className="ctrl-icon">📖</span>
          <span className="ctrl-label">规则</span>
        </button>

        <button
          className="ctrl-btn danger"
          onClick={() => {
            if (confirm(COPY.confirm.resign)) resign();
          }}
        >
          <span className="ctrl-icon">🏳</span>
          <span className="ctrl-label">{COPY.game.resign}</span>
        </button>
      </footer>

      <PromotionDialog />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

/** 战利品缩略行：显示已吃掉的对方棋子与领先分。 */
function CapturedRow({
  pieces,
  color,
  bonus,
  align = 'left',
}: {
  pieces: PieceSymbol[];
  color: Color;
  bonus: number;
  align?: 'left' | 'right';
}) {
  if (pieces.length === 0 && bonus === 0) return <span className="captured-mini empty" />;
  return (
    <span className={`captured-mini ${align}`}>
      {pieces.map((p, i) => (
        <AnimalPiece key={i} type={p} color={color} size={16} />
      ))}
      {bonus > 0 && <span className="advantage">+{bonus}</span>}
    </span>
  );
}

function materialScore(pieces: PieceSymbol[]): number {
  return pieces.reduce((sum, p) => sum + Math.round(PIECE_VALUE[p] / 100), 0);
}

/** 规则说明弹窗：动物棋子怎么走。 */
function RulesModal({ onClose }: { onClose: () => void }) {
  const order: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="rules-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>动物棋子怎么走</h3>
        <ul className="rules-list">
          {order.map((code) => {
            const info = PIECE_INFO[code];
            return (
              <li key={code}>
                <span className="rules-icon">
                  <AnimalPiece type={code} color="w" size={40} />
                </span>
                <span className="rules-text">
                  <b>
                    {info.animalZh}
                    <span className="rules-corr"> · {info.chessZh}</span>
                  </b>
                  <span>{info.moveDesc}</span>
                  <span className="rules-special">{info.specialAbility}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="rules-foot">
          小鸡走到对岸可以“长大”成 {PROMOTION_CHOICES.map((c) => PIECE_INFO[c].animalZh).join('、')}。
        </p>
        <button className="btn primary" onClick={onClose}>
          我知道啦
        </button>
      </div>
    </div>
  );
}
