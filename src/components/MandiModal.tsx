import React from 'react';
import { HudSnapshot } from '../sim/types';

interface MandiModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSellGrain: () => void;
  onBuySeeds: () => void;
  onSwitchVehicle: (id: 'tractor' | 'harvester' | 'jcb' | 'bulldozer' | 'truck') => void;
}

export const MandiModal: React.FC<MandiModalProps> = ({
  hud,
  onClose,
  onSellGrain,
  onBuySeeds,
  onSwitchVehicle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mandi-title"
        className="w-full max-w-2xl rounded-xl border border-[#E5A93C]/30 p-6 shadow-2xl text-[#F5F0E6]"
        style={{ backgroundColor: '#191714' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 id="mandi-title" className="font-display text-3xl font-bold text-[#F5F0E6]">
              Shubham Anaj Mandi · गाँव का बाजार
            </h2>
            <p className="text-sm text-[#BFB6A6] mt-0.5">
              Grain trading, seed supply, and village farm overview
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mandi Market"
            className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b border-white/10">
          <div>
            <div className="text-xs text-[#9E9585]">Farm Wallet</div>
            <div className="font-display text-2xl font-bold text-[#E5A93C] tabular-nums">
              ₹{hud.rupees.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9E9585]">Seeds Stock</div>
            <div className="font-display text-2xl font-bold tabular-nums">{hud.seedsKg} kg</div>
          </div>
          <div>
            <div className="text-xs text-[#9E9585]">Total Sold</div>
            <div className="font-display text-2xl font-bold tabular-nums">{hud.totalSoldKg} kg</div>
          </div>
        </div>

        {/* Trade Actions */}
        <div className="py-4 grid sm:grid-cols-2 gap-4 border-b border-white/10">
          <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03] flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#F5F0E6]">Sell Harvested Grain</div>
              <div className="text-xs text-[#BFB6A6] mt-1">
                Active load: <strong className="text-[#E5A93C]">{hud.grainCarriedKg} kg</strong> ·
                Rates: Wheat ₹26/kg · Paddy ₹24/kg · Mustard ₹54/kg
              </div>
            </div>
            <button
              type="button"
              onClick={onSellGrain}
              disabled={hud.grainCarriedKg <= 0}
              className="px-4 py-2 rounded-md bg-[#D97706] hover:bg-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white cursor-pointer"
            >
              Sell {hud.grainCarriedKg} kg Grain
            </button>
          </div>

          <div className="p-4 rounded-lg border border-white/10 bg-white/[0.03] flex flex-col justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#F5F0E6]">Buy Certified Seeds</div>
              <div className="text-xs text-[#BFB6A6] mt-1">
                100 kg high-yield Wheat/Paddy/Mustard seed sack for Seed Drill
              </div>
            </div>
            <button
              type="button"
              onClick={onBuySeeds}
              disabled={hud.rupees < 1800}
              className="px-4 py-2 rounded-md bg-[#2E7D32] hover:bg-[#256628] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white cursor-pointer"
            >
              Buy 100 kg Seeds (₹1,800)
            </button>
          </div>
        </div>

        {/* Field Progress & Village Landmarks */}
        <div className="pt-4 grid sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-[#E5A93C] mb-2">Agricultural Fields</div>
            <ul className="space-y-1.5 text-[#D8D0C1] tabular-nums">
              {hud.fieldSummaries.map((f) => (
                <li key={f.id} className="flex justify-between">
                  <span>{f.name}</span>
                  <span className="font-semibold text-white">
                    {f.dominantStage.toUpperCase()} ({f.progressPct}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#E5A93C] mb-2">Village Map & Fleet</div>
            <p className="text-[#BFB6A6] leading-relaxed mb-2">
              North-West Highway: Diesel Pump · North-East Highway: Mandi · South Tracks: 3 Fields ·
              East Yard: Gaushala & Thresher
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['tractor', 'harvester', 'jcb', 'bulldozer', 'truck'] as const).map((vid) => (
                <button
                  key={vid}
                  type="button"
                  onClick={() => {
                    onSwitchVehicle(vid);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-medium capitalize cursor-pointer"
                >
                  Drive {vid}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
