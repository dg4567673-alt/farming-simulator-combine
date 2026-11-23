import React from 'react';
import { HudSnapshot } from '../sim/types';
import { PWAInstallButton } from './PWAInstallButton';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="w-full max-w-md rounded-xl border border-[#E5A93C]/30 p-6 shadow-2xl text-[#F5F0E6]"
        style={{ backgroundColor: '#191714' }}
      >
        <h2 id="pause-title" className="font-display text-3xl font-bold">
          Simulation Paused
        </h2>
        <p className="text-sm text-[#BFB6A6] mt-1">Shubham Farming Simulator · Village Session</p>

        <div className="grid grid-cols-3 gap-3 my-5 py-4 border-y border-white/10">
          <div>
            <div className="text-[11px] text-[#9E9585]">Balance</div>
            <div className="font-display text-xl font-bold text-[#E5A93C] tabular-nums">
              ₹{hud.rupees.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#9E9585]">Harvested</div>
            <div className="font-display text-xl font-bold tabular-nums">
              {hud.totalHarvestedKg} kg
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#9E9585]">Sold</div>
            <div className="font-display text-xl font-bold tabular-nums">{hud.totalSoldKg} kg</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-sm font-semibold text-white cursor-pointer"
          >
            Resume Farming
          </button>
          <PWAInstallButton variant="modal" />
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-[#F5F0E6] cursor-pointer"
          >
            Restart Farm
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-[#BFB6A6] cursor-pointer"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
