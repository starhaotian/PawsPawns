import type { PieceSymbol, Color } from '../types';
import { PIECE_INFO } from '../data/pieceMap';

interface Props {
  type: PieceSymbol;
  color: Color;
  size?: number;
}

/**
 * 动物棋子：使用 3D 卡通渲染精灵图（public/pieces/{faction}-{type}.png）。
 * 草原族(白)=savanna 暖金，苔原族(黑)=tundra 冷蓝，完美还原概念稿角色造型与配色。
 */
export function AnimalPiece({ type, color, size = 64 }: Props) {
  const faction = color === 'w' ? 'savanna' : 'tundra';
  const src = `${import.meta.env.BASE_URL}pieces/${faction}-${type}.png`;
  const label = PIECE_INFO[type]?.animalZh ?? '';

  return (
    <img
      src={src}
      width={size}
      height={size}
      className="animal-piece"
      alt={label}
      draggable={false}
    />
  );
}
