// 生成 PawsPawns 的开局库：用 chess.js 回放 SAN 主线，按局面归一化键收集候选走法。
// 用法：node gen-openings.mjs > 目标 .ts 文件
import { Chess } from 'chess.js';

/** 常见开局主线（SAN），覆盖前 8~12 手。 */
const LINES = [
  // —— 1.e4 开放系 ——
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6', // 意大利
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 O-O d6', // 意大利慢棋
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', // 西班牙
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6', // 柏林防御
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4', // 苏格兰
  'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O', // 四马
  'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7', // 菲利多
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5', // 彼得罗夫
  'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bb4 Nge2 d6', // 维也纳
  'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6', // 主教开局
  // —— 1.e4 半开放系 ——
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', // 西西里·纳道夫
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5', // 西西里·龙式前奏
  'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6', // 闭锁西西里
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nf6 Nc3 d6', // 西西里·舍维宁根
  'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5', // 法兰西
  'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5', // 法兰西·塔拉什
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6', // 卡罗康
  'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6', // 卡罗康·交换
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6', // 斯堪的纳维亚
  'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O', // 皮尔茨
  'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6', // 阿廖新
  'e4 g6 d4 Bg7 Nc3 d6 Be3 Nf6 Qd2 O-O', // 现代防御
  // —— 1.d4 系 ——
  'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bg5 h6', // 后翼弃兵防御
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6', // 斯拉夫
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5', // 后翼弃兵接受
  'd4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bxd6 Qxd6', // 伦敦体系
  'd4 d5 Nf3 Nf6 c4 e6 Nc3 Be7 Bg5 O-O',
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5', // 尼姆佐印度
  'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7', // 后翼印度
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O', // 王翼印度
  'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3', // 格林菲尔德
  'd4 Nf6 Nf3 g6 c4 Bg7 Nc3 O-O e4 d6',
  'd4 e6 c4 Nf6 Nf3 d5 Nc3 Be7 Bg5 O-O',
  // —— 侧翼开局 ——
  'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6', // 英国式
  'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7 Bg5 O-O',
  'Nf3 d5 d4 Nf6 c4 e6 Nc3 Be7 Bg5 O-O', // 列蒂
  'Nf3 Nf6 c4 e6 Nc3 d5 d4 Be7 Bf4 O-O',
];

/** 取 FEN 的前两段（棋子布局 + 行棋方）作为归一化键。 */
function openingKey(fen) {
  const parts = fen.split(' ');
  return `${parts[0]} ${parts[1]}`;
}

const book = new Map();
let bad = 0;
for (const line of LINES) {
  const chess = new Chess();
  for (const san of line.trim().split(/\s+/)) {
    const key = openingKey(chess.fen());
    let ok = true;
    try {
      chess.move(san);
    } catch {
      ok = false;
    }
    if (!ok) {
      console.error(`非法走法：${san}（在 ${line}）`);
      bad++;
      break;
    }
    if (!book.has(key)) book.set(key, new Set());
    book.get(key).add(san);
  }
}
if (bad > 0) process.exit(1);

const entries = [...book.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const maxPly = Math.max(...LINES.map((l) => l.trim().split(/\s+/).length));

const body = entries
  .map(([key, sans]) => `  '${key}': [${[...sans].map((s) => `'${s}'`).join(', ')}],`)
  .join('\n');

process.stdout.write(`/**
 * 极简开局库：以 FEN 局面（仅取位置 + 行棋方）为键，映射到该局面下的推荐走法（SAN）。
 * 命中时用引擎的确定性 RNG 随机选一条，让开局有变化又不至于走岔。
 *
 * 本文件由 scripts/gen-openings.mjs 从主流开局主线生成，请勿手工编辑。
 * 覆盖 ${LINES.length} 条主线、${entries.length} 个局面，最深 ${maxPly} 手（ply）。
 */

/** 取 FEN 的前两段（棋子布局 + 行棋方）作为归一化键。 */
export function openingKey(fen: string): string {
  const parts = fen.split(' ');
  return \`\${parts[0]} \${parts[1]}\`;
}

export const OPENING_BOOK: Record<string, string[]> = {
${body}
};
`);
console.error(`已生成 ${entries.length} 个局面，最深 ${maxPly} 手`);
