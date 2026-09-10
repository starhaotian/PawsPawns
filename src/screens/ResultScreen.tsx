import { useGameStore } from '../store/gameStore';
import { COPY } from '../data/copy';

/** 结算页：根据胜负与和局原因展示结果，提供再来一局/返回菜单。 */
export function ResultScreen() {
  const winner = useGameStore((s) => s.winner);
  const drawReason = useGameStore((s) => s.drawReason);
  const status = useGameStore((s) => s.status);
  const resigned = useGameStore((s) => s.resigned);
  const settings = useGameStore((s) => s.settings);
  const startGame = useGameStore((s) => s.startGame);
  const backToMenu = useGameStore((s) => s.backToMenu);

  const playerWon = winner === settings.faction;
  const isDraw = winner === 'draw';

  let title: string;
  let emoji: string;
  let detail: string;

  if (isDraw) {
    title = COPY.result.draw;
    emoji = '🤝';
    detail =
      drawReason === 'repetition'
        ? COPY.result.repetition
        : drawReason === 'insufficient-material'
          ? COPY.result.insufficient
          : drawReason === 'fifty-move'
            ? COPY.result.fiftyMove
            : COPY.result.stalemate;
    if (status === 'stalemate') detail = COPY.result.stalemate;
  } else if (playerWon) {
    title = COPY.result.win;
    emoji = '🏆';
    detail = COPY.result.checkmateWin;
  } else {
    title = COPY.result.lose;
    emoji = '🦁';
    detail = resigned ? COPY.result.resign : COPY.result.checkmateLose;
  }

  return (
    <div className="result">
      <div className={`result-card ${playerWon ? 'win' : isDraw ? 'draw' : 'lose'}`}>
        <div className="result-emoji">{emoji}</div>
        <h1>{title}</h1>
        <p className="result-detail">{detail}</p>
        <div className="result-actions">
          <button className="btn primary large" onClick={startGame}>
            {COPY.result.rematch}
          </button>
          <button className="btn large" onClick={backToMenu}>
            {COPY.game.backToMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
