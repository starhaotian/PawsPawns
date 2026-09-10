import { useGameStore } from './store/gameStore';
import { MenuScreen } from './screens/MenuScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  return (
    <div className="app">
      {screen === 'menu' && <MenuScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}
