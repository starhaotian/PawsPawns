import { useGameStore, loadSave } from '../store/gameStore';
import { DIFFICULTIES } from '../data/difficulty';
import { HANDICAPS } from '../data/difficulty';
import { FACTIONS } from '../data/copy';
import { COPY } from '../data/copy';
import { PIECE_INFO } from '../data/pieceMap';
import { AnimalPiece } from '../components/AnimalPiece';
import type { Level, Handicap, Faction } from '../types';

/** 主菜单：选择难度、让子、阵营，展示棋子图鉴，开始对局。 */
export function MenuScreen() {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const startGame = useGameStore((s) => s.startGame);
  const hasSave = loadSave() !== null;

  return (
    <div className="menu">
      <header className="menu-hero">
        <h1 className="brand">
          {COPY.appTitle} <span className="paw">🐾</span>
        </h1>
        <p className="subtitle">{COPY.appSubtitle} · Kingdom of Beasts</p>
      </header>

      <section className="menu-section">
        <h2>{COPY.menu.chooseDifficulty}</h2>
        <div className="option-grid">
          {(Object.values(DIFFICULTIES)).map((d) => (
            <button
              key={d.level}
              className={`option-card ${settings.level === d.level ? 'active' : ''}`}
              onClick={() => update({ level: d.level as Level })}
            >
              <span className="option-emoji">{d.emoji}</span>
              <span className="option-title">
                {d.nameZh} · {d.nameEn}
              </span>
              <span className="option-desc">{d.tagline}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2>{COPY.menu.chooseHandicap}</h2>
        <div className="option-grid four">
          {Object.values(HANDICAPS).map((h) => (
            <button
              key={h.id}
              className={`option-card small ${settings.handicap === h.id ? 'active' : ''}`}
              onClick={() => update({ handicap: h.id as Handicap })}
            >
              <span className="option-title">{h.nameZh}</span>
              <span className="option-desc">{h.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2>{COPY.menu.chooseFaction}</h2>
        <div className="option-grid">
          {Object.values(FACTIONS).map((f) => (
            <button
              key={f.id}
              className={`option-card ${settings.faction === f.id ? 'active' : ''}`}
              onClick={() => update({ faction: f.id as Faction })}
              style={{ borderColor: settings.faction === f.id ? f.accent : undefined }}
            >
              <span className="option-title">
                {f.nameZh} · {f.nameEn}
              </span>
              <span className="option-desc">{f.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2>百兽图鉴</h2>
        <div className="codex">
          {(['k', 'q', 'r', 'b', 'n', 'p'] as const).map((code) => {
            const info = PIECE_INFO[code];
            return (
              <div className="codex-item" key={code}>
                <AnimalPiece type={code} color="w" size={48} />
                <div className="codex-text">
                  <b>
                    {info.animalZh}
                    <span className="codex-corr">＝{info.chessZh}</span>
                  </b>
                  <span>{info.moveDesc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="menu-actions">
        <button className="btn primary large" onClick={startGame}>
          {COPY.menu.start} →
        </button>
        {hasSave && (
          <span className="save-hint">上次对局进度会在新对局开始时被覆盖</span>
        )}
      </div>
    </div>
  );
}
