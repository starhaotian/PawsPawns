import type { PieceSymbol, Color } from '../types';

interface Props {
  type: PieceSymbol;
  color: Color;
  size?: number;
}

/**
 * 动物棋子 SVG（§5.4 中间路线：矢量结构 + 渐变高光营造轻度立体感）。
 * 草原族(白)用暖金渐变，苔原族(黑)用冷蓝渐变。造型走圆润卡通风。
 */
export function AnimalPiece({ type, color, size = 64 }: Props) {
  const light = color === 'w' ? '#ffe9b8' : '#cfe2f3';
  const mid = color === 'w' ? '#f0b34a' : '#7aa8d0';
  const dark = color === 'w' ? '#c9812a' : '#4a739c';
  const stroke = color === 'w' ? '#7a4d13' : '#2e4a68';
  const gid = `g-${type}-${color}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="animal-piece"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gid} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <filter id={`shadow-${gid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.1" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#shadow-${gid})`} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
        {renderAnimal(type, gid, stroke)}
      </g>
    </svg>
  );
}

function renderAnimal(type: PieceSymbol, fill: string, stroke: string) {
  const body = `url(#${fill})`;
  switch (type) {
    case 'k': // 狮子（王）：圆脸 + 鬃毛 + 小王冠
      return (
        <>
          {/* 鬃毛 */}
          <circle cx="32" cy="34" r="20" fill={body} />
          {maneSpikes(32, 34, 20, body)}
          {/* 脸 */}
          <circle cx="32" cy="35" r="13" fill="#fff3dd" />
          {/* 王冠 */}
          <path d="M22 16 L26 22 L32 15 L38 22 L42 16 L41 24 L23 24 Z" fill="#ffd24a" stroke={stroke} />
          {/* 眼睛鼻子 */}
          <circle cx="27" cy="34" r="1.8" fill={stroke} />
          <circle cx="37" cy="34" r="1.8" fill={stroke} />
          <path d="M29 40 Q32 43 35 40" fill="none" stroke={stroke} strokeWidth="1.4" />
          <circle cx="32" cy="38" r="1.6" fill={stroke} />
        </>
      );
    case 'q': // 母狮（后）：优雅圆脸 + 头饰
      return (
        <>
          <circle cx="32" cy="36" r="18" fill={body} />
          <circle cx="32" cy="37" r="12" fill="#fff3dd" />
          {/* 头饰宝石 */}
          <path d="M24 18 L32 12 L40 18 L36 24 L28 24 Z" fill="#f6a5c0" stroke={stroke} />
          <circle cx="32" cy="19" r="2.4" fill="#e56aa0" stroke={stroke} strokeWidth="1" />
          {/* 耳朵 */}
          <circle cx="20" cy="28" r="4.5" fill={body} />
          <circle cx="44" cy="28" r="4.5" fill={body} />
          <circle cx="27" cy="36" r="1.7" fill={stroke} />
          <circle cx="37" cy="36" r="1.7" fill={stroke} />
          <path d="M29 42 Q32 45 35 42" fill="none" stroke={stroke} strokeWidth="1.4" />
        </>
      );
    case 'r': // 大象（车）：大头 + 长鼻 + 大耳
      return (
        <>
          <ellipse cx="18" cy="34" rx="9" ry="12" fill={body} />
          <ellipse cx="46" cy="34" rx="9" ry="12" fill={body} />
          <circle cx="32" cy="34" r="16" fill={body} />
          {/* 鼻子 */}
          <path d="M32 40 Q30 52 36 54 Q40 55 40 50" fill={body} stroke={stroke} />
          {/* 牙 */}
          <path d="M26 46 Q24 52 27 53" fill="#fffaf0" stroke={stroke} strokeWidth="1" />
          <path d="M38 46 Q40 52 37 53" fill="#fffaf0" stroke={stroke} strokeWidth="1" />
          <circle cx="27" cy="32" r="1.7" fill={stroke} />
          <circle cx="37" cy="32" r="1.7" fill={stroke} />
        </>
      );
    case 'b': // 猫头鹰（象）：圆身 + 大眼 + 尖耳羽
      return (
        <>
          <ellipse cx="32" cy="36" rx="15" ry="17" fill={body} />
          {/* 耳羽 */}
          <path d="M20 22 L24 12 L28 24 Z" fill={body} />
          <path d="M44 22 L40 12 L36 24 Z" fill={body} />
          {/* 大眼 */}
          <circle cx="26" cy="32" r="6" fill="#fffaf0" stroke={stroke} strokeWidth="1.2" />
          <circle cx="38" cy="32" r="6" fill="#fffaf0" stroke={stroke} strokeWidth="1.2" />
          <circle cx="26" cy="32" r="2.4" fill={stroke} />
          <circle cx="38" cy="32" r="2.4" fill={stroke} />
          {/* 喙 */}
          <path d="M29 38 L32 44 L35 38 Z" fill="#ffb347" stroke={stroke} strokeWidth="1" />
          {/* 翅膀 */}
          <path d="M18 34 Q14 42 20 48" fill="none" stroke={stroke} strokeWidth="1.4" />
          <path d="M46 34 Q50 42 44 48" fill="none" stroke={stroke} strokeWidth="1.4" />
        </>
      );
    case 'n': // 袋鼠（马）：长脸 + 大耳 + 侧身
      return (
        <>
          {/* 身体 */}
          <path d="M22 52 Q20 40 26 34 Q30 30 36 30 L40 26 Q44 24 44 30 L42 36 Q46 40 44 48 L40 52 Z" fill={body} />
          {/* 头 */}
          <ellipse cx="40" cy="24" rx="7" ry="8" fill={body} />
          {/* 耳朵 */}
          <path d="M38 16 Q37 8 41 14 Z" fill={body} />
          <path d="M44 16 Q46 8 46 15 Z" fill={body} />
          {/* 眼 */}
          <circle cx="42" cy="23" r="1.6" fill={stroke} />
          {/* 鼻 */}
          <circle cx="46" cy="26" r="1.3" fill={stroke} />
          {/* 前爪 */}
          <path d="M34 36 Q32 40 35 42" fill="none" stroke={stroke} strokeWidth="1.4" />
        </>
      );
    case 'p': // 小鸡（兵）：圆身 + 小翅 + 尖喙
      return (
        <>
          <ellipse cx="32" cy="40" rx="12" ry="12" fill={body} />
          <circle cx="32" cy="26" r="9" fill={body} />
          {/* 头顶呆毛 */}
          <path d="M32 17 Q31 12 34 14 Q33 16 35 17" fill="none" stroke={stroke} strokeWidth="1.4" />
          {/* 眼 */}
          <circle cx="29" cy="25" r="1.5" fill={stroke} />
          <circle cx="35" cy="25" r="1.5" fill={stroke} />
          {/* 喙 */}
          <path d="M30 29 L32 33 L34 29 Z" fill="#ff9d2e" stroke={stroke} strokeWidth="1" />
          {/* 翅膀 */}
          <path d="M21 40 Q18 44 23 46" fill="none" stroke={stroke} strokeWidth="1.4" />
          <path d="M43 40 Q46 44 41 46" fill="none" stroke={stroke} strokeWidth="1.4" />
          {/* 脚 */}
          <path d="M28 52 L28 55 M36 52 L36 55" stroke="#ff9d2e" strokeWidth="1.6" />
        </>
      );
    default:
      return null;
  }
}

/** 生成狮子鬃毛的尖刺环。 */
function maneSpikes(cx: number, cy: number, r: number, fill: string) {
  const spikes = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    spikes.push(<circle key={i} cx={x} cy={y} r={4.5} fill={fill} />);
  }
  return <g>{spikes}</g>;
}
