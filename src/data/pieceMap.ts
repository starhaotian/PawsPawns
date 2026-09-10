import type { PieceInfo, PieceSymbol } from '../types';

/**
 * 棋子 → 动物映射（§2.2）。这是说明卡、aria-label、记谱面板的唯一数据源。
 * 映射逻辑：动物的现实行为要能"解释"该棋子的走法。
 */
export const PIECE_INFO: Record<PieceSymbol, PieceInfo> = {
  k: {
    code: 'k',
    animalZh: '狮子',
    animalEn: 'Lion',
    emoji: '🦁',
    chessZh: '王',
    chessEn: 'King',
    notation: 'K',
    valueLabel: '全族核心',
    moveDesc: '向任意方向走一格，包括斜着',
    specialAbility: '全族的核心，它被将死就输了；不能走到会被吃的格子',
  },
  q: {
    code: 'q',
    animalZh: '母狮',
    animalEn: 'Lioness',
    emoji: '🦁',
    chessZh: '后',
    chessEn: 'Queen',
    notation: 'Q',
    valueLabel: '全场最强',
    moveDesc: '横、竖、斜任意方向，想走多远走多远',
    specialAbility: '全场最强，但不能跳过棋子',
  },
  r: {
    code: 'r',
    animalZh: '大象',
    animalEn: 'Elephant',
    emoji: '🐘',
    chessZh: '车',
    chessEn: 'Rook',
    notation: 'R',
    valueLabel: '直线冲锋',
    moveDesc: '横着或竖着直线走，不限格数',
    specialAbility: '可以和狮王一起“易位”换到安全位置',
  },
  b: {
    code: 'b',
    animalZh: '猫头鹰',
    animalEn: 'Owl',
    emoji: '🦉',
    chessZh: '象',
    chessEn: 'Bishop',
    notation: 'B',
    valueLabel: '斜线滑翔',
    moveDesc: '只走斜线，不限格数',
    specialAbility: '一辈子只落在同一种颜色的格子上',
  },
  n: {
    code: 'n',
    animalZh: '袋鼠',
    animalEn: 'Kangaroo',
    emoji: '🦘',
    chessZh: '马',
    chessEn: 'Knight',
    notation: 'N',
    valueLabel: '跳跃奇兵',
    moveDesc: '走“日”字：横竖走两格再拐一格',
    specialAbility: '唯一能跳过其他棋子的动物',
  },
  p: {
    code: 'p',
    animalZh: '小鸡',
    animalEn: 'Chick',
    emoji: '🐥',
    chessZh: '兵',
    chessEn: 'Pawn',
    notation: '',
    valueLabel: '勇敢的孩子',
    moveDesc: '只能向前走一格；吃子时斜着吃',
    specialAbility: '第一步可走两格；走到对岸能“长大”成任意大动物',
  },
};

/** 可升变的目标棋子（不含王和兵） */
export const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];
