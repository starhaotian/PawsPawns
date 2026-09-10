import { useState } from 'react';
import { useGameStore, loadSave } from '../store/gameStore';
import { DIFFICULTIES } from '../data/difficulty';
import { HANDICAPS } from '../data/difficulty';
import { FACTIONS } from '../data/copy';
import { COPY } from '../data/copy';
import type { Level, Handicap, Faction } from '../types';

/**
 * 主菜单：默认只呈现「选择对手」这一核心决策，支持一键开始；
 * 让子与阵营等进阶选项收进可展开的「更多设置」，降低首屏负担（少即是多）。
 * 有存档时提供「继续上局」直接恢复对局。
 */
export function MenuScreen() {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const startGame = useGameStore((s) => s.startGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasSave = loadSave() !== null;

  const handicap = HANDICAPS[settings.handicap];
  const faction = FACTIONS[settings.faction];
  const advancedSummary = `${handicap.nameZh} · ${faction.nameZh}`;

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
          {Object.values(DIFFICULTIES).map((d) => (
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
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span>更多设置</span>
          <span className="advanced-summary">{advancedSummary}</span>
          <span className={`chevron ${showAdvanced ? 'open' : ''}`}>⌄</span>
        </button>

        {showAdvanced && (
          <div className="advanced-panel">
            <h3>{COPY.menu.chooseHandicap}</h3>
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

            <h3>{COPY.menu.chooseFaction}</h3>
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
          </div>
        )}
      </section>

      <div className="menu-actions">
        {hasSave && (
          <button className="btn large" onClick={resumeGame}>
            {COPY.menu.continueGame}
          </button>
        )}
        <button className="btn primary large" onClick={startGame}>
          {COPY.menu.start} →
        </button>
      </div>
    </div>
  );
}
