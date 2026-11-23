import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { HudOverlay } from './components/HudOverlay';
import { MandiModal } from './components/MandiModal';
import { PauseModal } from './components/PauseModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TitleScreen } from './components/TitleScreen';
import { FarmCanvas, FarmSimActions } from './scene/FarmCanvas';
import { GamePhase, HudSnapshot, VehicleId } from './sim/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  activeVehicleId: 'tractor',
  cameraMode: 'chase',
  speedKmh: 0,
  rpm: 820,
  fuelPct: 89,
  fuelLiters: 58,
  attachedImplement: 'plow',
  workActive: false,
  toolAngle: 0,
  grainCarriedKg: 0,
  grainCapacityKg: 0,
  rupees: 25000,
  seedsKg: 180,
  totalHarvestedKg: 0,
  totalSoldKg: 0,
  nearbyPrompt: null,
  fieldSummaries: [
    {
      id: 'field-wheat',
      name: 'Field 1 · Wheat (Gehu)',
      crop: 'wheat',
      dominantStage: 'fallow',
      progressPct: 0,
      moisturePct: 12,
    },
    {
      id: 'field-paddy',
      name: 'Field 2 · Paddy (Dhan)',
      crop: 'paddy',
      dominantStage: 'ripe',
      progressPct: 100,
      moisturePct: 40,
    },
    {
      id: 'field-mustard',
      name: 'Field 3 · Mustard (Sarson)',
      crop: 'mustard',
      dominantStage: 'growing',
      progressPct: 80,
      moisturePct: 85,
    },
  ],
  timeOfDayLabel: '07:45 AM · Morning Harvest',
  lastNotice: null,
};

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [phase, setPhase] = useState<GamePhase>(autostart ? 'playing' : 'title');
  const [hud, setHud] = useState<HudSnapshot>({
    ...INITIAL_HUD,
    phase: autostart ? 'playing' : 'title',
  });
  const [mandiOpen, setMandiOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const simRef = useRef<FarmSimActions | null>(null);

  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  const handleStart = useCallback(() => {
    soundEngine.resume();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setPhase('playing');
  }, []);

  const handleTogglePause = useCallback(() => {
    setMandiOpen(false);
    setPhase((prev) => {
      if (prev === 'playing') {
        document.body.dataset.state = 'paused';
        return 'paused';
      }
      if (prev === 'paused') {
        document.body.dataset.state = 'playing';
        return 'playing';
      }
      return prev;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.resume();
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onGlobalMute = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat) {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', onGlobalMute);
    return () => window.removeEventListener('keydown', onGlobalMute);
  }, [handleToggleMute]);

  const handleZoneAction = useCallback(() => {
    const prompt = hud.nearbyPrompt;
    if (!prompt) return;
    if (prompt.type === 'pump') simRef.current?.refuelActiveVehicle();
    else if (prompt.type === 'mandi') setMandiOpen(true);
    else if (prompt.type === 'implement') simRef.current?.toggleHitch();
    else if (prompt.type === 'field') simRef.current?.transferHarvesterToTrolley();
    else simRef.current?.toggleWork();
  }, [hud.nearbyPrompt]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#141210]">
      <FarmCanvas
        phase={phase}
        onSnapshot={setHud}
        onOpenMandi={() => setMandiOpen(true)}
        onTogglePause={handleTogglePause}
        onStartFromKey={handleStart}
        simRef={simRef}
      />

      {phase === 'title' && <TitleScreen onStart={handleStart} />}

      {phase === 'playing' && (
        <HudOverlay
          hud={hud}
          muted={muted}
          onSwitchVehicle={(id?: VehicleId) => simRef.current?.switchVehicle(id)}
          onToggleWork={() => simRef.current?.toggleWork()}
          onToggleHitch={() => simRef.current?.toggleHitch()}
          onNudgeArm={(d) => simRef.current?.nudgeToolArm(d)}
          onCycleCamera={() => simRef.current?.cycleCamera()}
          onToggleMute={handleToggleMute}
          onOpenMandi={() => setMandiOpen(true)}
          onTogglePause={handleTogglePause}
          onZoneAction={handleZoneAction}
          onTouchDrive={(t, s) => simRef.current?.setTouchDrive(t, s)}
        />
      )}

      {phase === 'playing' && mandiOpen && (
        <MandiModal
          hud={hud}
          onClose={() => setMandiOpen(false)}
          onSellGrain={() => simRef.current?.sellAllGrain()}
          onBuySeeds={() => simRef.current?.buySeedsBatch()}
          onSwitchVehicle={(id) => simRef.current?.switchVehicle(id)}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => {
            document.body.dataset.state = 'playing';
            setPhase('playing');
          }}
          onRestart={() => {
            simRef.current?.resetSimulation();
            document.body.dataset.state = 'playing';
            setPhase('playing');
          }}
          onReturnTitle={() => {
            simRef.current?.resetSimulation();
            document.body.dataset.state = 'title';
            setPhase('title');
          }}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
