import { useGameStore } from '../store/gameStore';
import { PROMOTION_CHOICES, PIECE_INFO } from '../data/pieceMap';
import { AnimalPiece } from './AnimalPiece';

/** 兵（小鸡）到达对岸的升变选择弹窗。 */
export function PromotionDialog() {
  const pending = useGameStore((s) => s.pendingPromotion);
  const resolve = useGameStore((s) => s.resolvePromotion);
  const cancel = useGameStore((s) => s.cancelPromotion);
  const faction = useGameStore((s) => s.settings.faction);
  if (!pending) return null;
  const color = faction === 'savanna' ? 'w' : 'b';

  return (
    <div className="modal-backdrop" onClick={cancel}>
      <div className="promotion-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>小鸡长大啦！选择要变成的动物</h3>
        <div className="promotion-choices">
          {PROMOTION_CHOICES.map((p) => (
            <button key={p} className="promotion-choice" onClick={() => resolve(p)}>
              <AnimalPiece type={p} color={color} size={56} />
              <span>{PIECE_INFO[p].animalZh}</span>
            </button>
          ))}
        </div>
        <p className="promotion-hint">选一个即可完成这步棋</p>
        <button className="btn promotion-cancel" onClick={cancel}>
          取消这步棋
        </button>
      </div>
    </div>
  );
}
