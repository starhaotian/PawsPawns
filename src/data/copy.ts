import type { Faction } from '../types';

/** 阵营视觉与文案。玩家默认草原族（白/先手）。 */
export interface FactionConfig {
  id: Faction;
  nameZh: string;
  nameEn: string;
  desc: string;
  /** 棋子主色（用于 SVG 描边/主体色调提示）。 */
  accent: string;
}

export const FACTIONS: Record<Faction, FactionConfig> = {
  savanna: {
    id: 'savanna',
    nameZh: '草原族',
    nameEn: 'Savanna',
    desc: '温暖金色的草原百兽，执白先手',
    accent: '#e0a03a',
  },
  tundra: {
    id: 'tundra',
    nameZh: '苔原族',
    nameEn: 'Tundra',
    desc: '清冷蓝调的苔原百兽，执黑后手',
    accent: '#5a8fbf',
  },
};

/** 全站 UI 文案库，集中管理便于统一语气与后续国际化。 */
export const COPY = {
  appTitle: 'Paws & Pawns',
  appSubtitle: '百兽王国象棋',
  menu: {
    start: '开始对局',
    chooseDifficulty: '选择对手',
    chooseHandicap: '让子设置',
    chooseFaction: '选择阵营',
    continueGame: '继续上局',
    playerSide: '你执',
  },
  game: {
    yourTurn: '轮到你了',
    aiThinking: '对手思考中…',
    check: '将军！',
    undo: '悔棋',
    hint: '提示',
    resign: '认输',
    newGame: '新对局',
    backToMenu: '返回主菜单',
    moves: '棋谱',
    captured: '战利品',
    flipBoard: '翻转棋盘',
  },
  result: {
    win: '胜利！',
    lose: '惜败',
    draw: '和局',
    checkmateWin: '将死对手，恭喜获胜！',
    checkmateLose: '你的狮王被将死了',
    stalemate: '逼和——无子可动但未被将军',
    fiftyMove: '五十步未吃子，判和',
    repetition: '三次重复局面，判和',
    insufficient: '子力不足，无法将死，判和',
    resign: '你选择了认输',
    rematch: '再来一局',
  },
  tooltip: {
    correspondsTo: '相当于国际象棋的',
    howToMove: '怎么走',
    special: '特殊本领',
  },
  confirm: {
    undo: '悔棋会同时撤销对手的上一步，确定吗？',
    resign: '确定认输本局吗？',
    newGame: '放弃当前进度，开始新对局？',
  },
} as const;
