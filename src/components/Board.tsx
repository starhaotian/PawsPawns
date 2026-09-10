import { useState } from 'react';
import type { Square as SquareT } from '../types';
import { useGameStore } from '../store/gameStore';
import { AnimalPiece } from './AnimalPiece';
import { PieceTooltip } from './PieceTooltip';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/** 国际象棋棋盘：8x8 格 + 动物棋子 + 高亮/坐标/悬浮说明卡。 */
export function Board() {
  const chess = useGameStore((s) => s.chess);
  const orientation = useGameStore((s) => s.orientation);
  const selected = useGameStore((s) => s.selected);
  const legalTargets = useGameStore((s) => s.legalTargets);
  const lastMove = useGameStore((s) => s.lastMove);
  const hintMove = useGameStore((s) => s.hintMove);
  const status = useGameStore((s) => s.status);
  const tooltipDetail = useGameStore((s) => s.settings.tooltipDetail);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const [hovered, setHovered] = useState<SquareT | null>(null);

  // 依据视角决定行列顺序（草原族=白在下；苔原族=翻转）
  const files = orientation === 'savanna' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'savanna' ? RANKS : [...RANKS].reverse();

  // 将军时高亮被将的王
  let checkedKingSquare: SquareT | null = null;
  if (status === 'check' || status === 'checkmate') {
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === turn) {
          checkedKingSquare = (FILES[f] + (8 - r)) as SquareT;
        }
      }
    }
  }

  return (
    <div className="board" role="grid" aria-label="棋盘">
      {ranks.map((rank, rIdx) => (
        <div className="board-row" role="row" key={rank}>
          {files.map((file, fIdx) => {
            const sq = (file + rank) as SquareT;
            const piece = chess.get(sq);
            const isLight = (rIdx + fIdx) % 2 === 0;
            const isSelected = selected === sq;
            const isTarget = legalTargets.includes(sq);
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isHint = hintMove && (hintMove.from === sq || hintMove.to === sq);
            const isChecked = checkedKingSquare === sq;
            const showFileLabel = rIdx === 7;
            const showRankLabel = fIdx === 0;

            const classes = [
              'square',
              isLight ? 'light' : 'dark',
              isSelected ? 'selected' : '',
              isLast ? 'last-move' : '',
              isHint ? 'hint' : '',
              isChecked ? 'checked' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                type="button"
                className={classes}
                role="gridcell"
                key={sq}
                aria-label={sq}
                onClick={() => selectSquare(sq)}
                onMouseEnter={() => setHovered(sq)}
                onMouseLeave={() => setHovered((h) => (h === sq ? null : h))}
              >
                {isTarget && <span className={piece ? 'target-ring' : 'target-dot'} />}
                {piece && (
                  <span className="piece-wrap">
                    <AnimalPiece type={piece.type} color={piece.color} />
                    {hovered === sq && tooltipDetail !== 'off' && (
                      <PieceTooltip type={piece.type} detail={tooltipDetail} />
                    )}
                  </span>
                )}
                {showRankLabel && <span className="coord coord-rank">{rank}</span>}
                {showFileLabel && <span className="coord coord-file">{file}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
