/**
 * 极简开局库：以 FEN 局面（仅取位置+行棋方部分）为键，映射到推荐的 SAN 走法列表。
 * 覆盖常见开局前几步，让游侠/长老档开局更自然。命中时随机选一个（用外部 RNG）。
 */

/** 取 FEN 的前两段（棋子布局 + 行棋方）作为归一化键。 */
export function openingKey(fen: string): string {
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]}`;
}

// 键为归一化 FEN，值为该局面下的候选走法（SAN）。
export const OPENING_BOOK: Record<string, string[]> = {
  // 起始局面（白先）——常见第一步
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w': ['e4', 'd4', 'c4', 'Nf3'],
  // 1.e4 之后黑方应对
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b': ['c5', 'e5', 'e6', 'c6'],
  // 1.d4 之后黑方应对
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b': ['d5', 'Nf6', 'e6'],
  // 1.e4 e5 之后白方
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w': ['Nf3', 'Bc4', 'Nc3'],
  // 1.e4 c5 (西西里) 之后白方
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w': ['Nf3', 'Nc3', 'c3'],
  // 1.d4 d5 之后白方
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w': ['c4', 'Nf3', 'Bf4'],
  // 1.e4 e5 2.Nf3 黑方
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b': ['Nc6', 'Nf6', 'd6'],
};
