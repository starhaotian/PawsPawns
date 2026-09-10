import { useState } from 'react';
import { Board } from '../components/Board';
import { PromotionDialog } from '../components/PromotionDialog';
import { AnimalPiece } from '../components/AnimalPiece';
import { useGameStore, MAX_HINTS } from '../store/gameStore';
import { DIFFICULTIES } from '../data/difficulty';
import { FACTIONS } from '../data/copy';
import { COPY } from '../data/copy';
import { PIECE_INFO, PROMOTION_CHOICES } from '../data/pieceMap';
import { PIECE_VALUE } from '../engine/evaluate';
import type { PieceSymbol, Color, Faction } from '../types';

/** 阵营图标：用于对战信息条的身份标识（取代含义不清的奖杯 emoji）。 */
const FACTION_GLYPH: Record<Faction, string> = { savanna: '🌿', tundra: '❄️' };

/** 对局页：还原概念稿——顶部对战信息条 + 木质棋盘 + 底部圆润操作栏。 */
export function GameScreen() {
  const history = useGameStore((s) => s.history);
  const captured = useGameStore((s) => s.captured);
  const status = useGameStore((s) => s.status);
  const aiThinking = useGameStore((s) => s.aiThinking);
  const settings = useGameStore((s) => s.settings);
  const chess = useGameStore((s) => s.chess);
  const hintsLeft = useGameStore((s) => s.hintsLeft);
  const undo = useGameStore((s) => s.undo);
  const requestHint = useGameStore((s) => s.requestHint);
  const resign = useGameStore((s) => s.resign);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const [showRules, setShowRules] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'resign' | 'undo' | null>(null);

  const playerFaction = settings.faction;
  const oppFaction: Faction = playerFaction === 'savanna' ? 'tundra' : 'savanna';
  const playerColor: Color = playerFaction === 'savanna' ? 'w' : 'b';
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

  const canUndo = !aiThinking && history.length > 0;
  const canHint = isPlayerTurn && hintsLeft > 0;

  return (
    <div className="game-screen">
      {/* 顶部对战信息条 */}
      <header className="top-bar">
        <button className="icon-btn" onClick={backToMenu} aria-label={COPY.game.backToMenu} title={COPY.game.backToMenu}>
          <span className="icon-glyph">←</span>
        </button>

        <div className={`player-card ${playerFaction} ${isPlayerTurn ? 'active' : ''}`}>
          <div className="avatar">
            <AnimalPiece type="k" color={playerColor} size={44} />
          </div>
          <div className="player-info">
            <span className="player-name">你</span>
            <span className="player-meta">
              {FACTION_GLYPH[playerFaction]} {FACTIONS[playerFaction].nameZh}
            </span>
            <CapturedRow pieces={playerGains} color={oppColor} bonus={score > 0 ? score : 0} />
          </div>
        </div>

        <div className={`turn-pill ${status === 'check' ? 'alarm' : ''}`}>
          {aiThinking ? <span className="spinner" /> : <span className="crown">👑</span>}
          <span>{statusText}</span>
        </div>

        <div className={`player-card ${oppFaction} ${!isPlayerTurn ? 'active' : ''}`}>
          <div className="player-info right">
            <span className="player-name">{diff.nameZh}</span>
            <span className="player-meta">
              {diff.emoji} Lv.{settings.level}
            </span>
            <CapturedRow pieces={aiGains} color={playerColor} bonus={score < 0 ? -score : 0} align="right" />
          </div>
          <div className="avatar">
            <AnimalPiece type="k" color={oppColor} size={44} />
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
          onClick={() => setConfirmKind('undo')}
          disabled={!canUndo}
        >
          <span className="ctrl-icon">↩</span>
          <span className="ctrl-label">{COPY.game.undo}</span>
        </button>

        <button className="ctrl-btn" onClick={requestHint} disabled={!canHint}>
          <span className="ctrl-icon">💡</span>
          {hintsLeft > 0 && <span className="badge">{hintsLeft}</span>}
          <span className="ctrl-label">
            {hintsLeft > 0 ? COPY.game.hint : '已用完'}
          </span>
        </button>

        {/* 提示额度反馈，取代与顶部重复的回合状态文字 */}
        <div className="hint-meter" aria-live="polite">
          <span className="hint-meter-icon">💡</span>
          <span className="hint-meter-text">
            {hintsLeft > 0 ? `提示剩 ${hintsLeft}/${MAX_HINTS}` : '提示已用完'}
          </span>
        </div>

        <button className="ctrl-btn" onClick={() => setShowRules(true)}>
          <span className="ctrl-icon">📖</span>
          <span className="ctrl-label">规则</span>
        </button>

        <button className="ctrl-btn danger" onClick={() => setConfirmKind('resign')}>
          <span className="ctrl-icon">🏳</span>
          <span className="ctrl-label">{COPY.game.resign}</span>
        </button>
      </footer>

      <PromotionDialog />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {confirmKind && (
        <ConfirmDialog
          message={confirmKind === 'resign' ? COPY.confirm.resign : COPY.confirm.undo}
          confirmLabel={confirmKind === 'resign' ? COPY.game.resign : COPY.game.undo}
          danger={confirmKind === 'resign'}
          onConfirm={() => {
            if (confirmKind === 'resign') resign();
            else undo();
            setConfirmKind(null);
          }}
          onCancel={() => setConfirmKind(null)}
        />
      )}
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

/** 通用的应用内确认弹窗，统一悔棋/认输的确认交互，取代原生 confirm()。 */
function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button className={`btn primary ${danger ? 'danger-solid' : ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
