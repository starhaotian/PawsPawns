import { PIECE_INFO } from '../data/pieceMap';
import { COPY } from '../data/copy';
import type { PieceSymbol, TooltipDetail } from '../types';

interface Props {
  type: PieceSymbol;
  detail: TooltipDetail;
}

/**
 * 棋子悬浮说明卡（§5.5）。展示动物名、对应的标准棋子、走法与特殊本领。
 * detail='beginner' 显示全部；'brief' 只显示对应棋子与走法；'off' 不渲染。
 */
export function PieceTooltip({ type, detail }: Props) {
  if (detail === 'off') return null;
  const info = PIECE_INFO[type];
  return (
    <div className="tooltip-card" role="tooltip">
      <div className="tooltip-head">
        <span className="tooltip-emoji">{info.emoji}</span>
        <div>
          <div className="tooltip-name">
            {info.animalZh} <span className="tooltip-en">{info.animalEn}</span>
          </div>
          <div className="tooltip-corr">
            {COPY.tooltip.correspondsTo}
            <b>
              {info.chessZh}
              {info.notation ? `（${info.notation}）` : ''}
            </b>
          </div>
        </div>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">{COPY.tooltip.howToMove}</span>
        <span>{info.moveDesc}</span>
      </div>
      {detail === 'beginner' && info.specialAbility && (
        <div className="tooltip-row">
          <span className="tooltip-label">{COPY.tooltip.special}</span>
          <span>{info.specialAbility}</span>
        </div>
      )}
    </div>
  );
}
