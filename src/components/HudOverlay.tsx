import React, { useState } from 'react';
import { HudSnapshot, ImplementId, VehicleId } from '../sim/types';
import { getVehicleActionLabel } from '../sim/farmingLogic';
import { VEHICLE_SPECS } from '../sim/worldLayout';
import { PWAInstallButton } from './PWAInstallButton';

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  onSwitchVehicle: (id?: VehicleId) => void;
  onToggleWork: () => void;
  onToggleHitch: () => void;
  onNudgeArm: (delta: number) => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onOpenMandi: () => void;
  onTogglePause: () => void;
  onZoneAction: () => void;
  onTouchDrive: (throttle: number, steer: number) => void;
}

const VEHICLE_BUTTONS: Array<{ id: VehicleId; label: string; keyHint: string }> = [
  { id: 'tractor', label: 'Tractor', keyHint: '1' },
  { id: 'harvester', label: 'Harvester', keyHint: '2' },
  { id: 'jcb', label: 'JCB', keyHint: '3' },
  { id: 'bulldozer', label: 'Bulldozer', keyHint: '4' },
  { id: 'truck', label: 'Truck', keyHint: '5' },
];

const IMPLEMENT_LABELS: Record<ImplementId, string> = {
  plow: 'Cultivator Plow',
  seeder: 'Seed Drill',
  water_tanker: 'Water Tanker',
  trolley: 'Grain Trolley',
};

const STAGE_LABELS: Record<string, string> = {
  fallow: 'Fallow',
  plowed: 'Plowed',
  seeded: 'Seeded',
  watered: 'Watered',
  growing: 'Growing',
  ripe: 'Ripe',
};

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  muted,
  onSwitchVehicle,
  onToggleWork,
  onToggleHitch,
  onNudgeArm,
  onCycleCamera,
  onToggleMute,
  onOpenMandi,
  onTogglePause,
  onZoneAction,
  onTouchDrive,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const activeSpec = VEHICLE_SPECS[hud.activeVehicleId];
  const actionLabel = getVehicleActionLabel(hud.activeVehicleId, hud.attachedImplement);
  const lowFuel = hud.fuelPct <= 18;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 md:p-5">
      {/* Top Perimeter Row (stacks cleanly on narrow portrait phones so utility buttons never clip) */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        {/* Top-Left Compact Economy & Field Status Cluster */}
        <div
          className="pointer-events-auto rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 border border-[#E5A93C]/25 shadow-lg w-full sm:w-auto sm:max-w-md"
          style={{ backgroundColor: 'rgba(20, 18, 15, 0.88)' }}
        >
          <div className="flex items-baseline justify-between sm:justify-start gap-3 sm:gap-5">
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#B6AD9D]">
                Balance
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold text-[#E5A93C] tabular-nums leading-tight whitespace-nowrap">
                ₹{hud.rupees.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#B6AD9D]">
                Seeds
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E6] tabular-nums leading-tight whitespace-nowrap">
                {hud.seedsKg} kg
              </div>
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#B6AD9D]">
                Grain Load
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E6] tabular-nums leading-tight whitespace-nowrap">
                {hud.grainCarriedKg} kg
              </div>
            </div>
          </div>

          {/* Clean unboxed typographic field progress summary */}
          <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-[#CFC6B4] tabular-nums">
            {hud.fieldSummaries.map((f, idx) => (
              <React.Fragment key={f.id}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span className="whitespace-nowrap">
                  {f.crop === 'wheat' ? 'F1 Wheat' : f.crop === 'paddy' ? 'F2 Paddy' : 'F3 Mustard'}:{' '}
                  <strong
                    className={
                      f.dominantStage === 'ripe' ? 'text-[#FBBF24] font-semibold' : 'text-[#F5F0E6] font-medium'
                    }
                  >
                    {STAGE_LABELS[f.dominantStage] ?? f.dominantStage}
                  </strong>
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Contextual Nearby Zone Action (Mandi / Petrol Pump / Hitch / Unload) */}
          {hud.nearbyPrompt && (
            <div className="mt-2 pt-2 border-t border-[#E5A93C]/25 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#FBBF24] truncate">
                  {hud.nearbyPrompt.label}
                </div>
                <div className="text-[11px] text-[#D8D0C1] truncate">
                  {hud.nearbyPrompt.sublabel}
                </div>
              </div>
              {hud.nearbyPrompt.actionHint && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onZoneAction();
                  }}
                  className="px-3 py-1.5 rounded bg-[#D97706] hover:bg-[#B45309] text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {hud.nearbyPrompt.type === 'pump'
                    ? 'Refuel [R]'
                    : hud.nearbyPrompt.type === 'mandi'
                      ? 'Mandi [B]'
                      : hud.nearbyPrompt.type === 'implement'
                        ? 'Hitch [E]'
                        : hud.nearbyPrompt.type === 'field'
                          ? 'Unload [R]'
                          : 'Work [F]'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center-Top Subtle Transient Guidance Banner */}
        {hud.lastNotice && !hud.nearbyPrompt && (
          <div
            className="hidden lg:block rounded-md px-4 py-2 border border-white/15 text-xs text-[#F5F0E6] hud-stroke max-w-md text-center"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.82)' }}
          >
            {hud.lastNotice}
          </div>
        )}

        {/* Top-Right Compact Utility Buttons */}
        <div className="pointer-events-auto flex items-center justify-end flex-wrap gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton variant="hud" />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Mandi & Village Guide"
            title="Mandi & Guide"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMandi();
            }}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-white/15 hover:border-[#E5A93C]/60 text-[11px] sm:text-xs font-medium text-[#F5F0E6] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.88)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
            <span className="sm:hidden">Mandi</span>
            <span className="hidden sm:inline">Mandi &amp; Guide</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={`Switch Camera (${hud.cameraMode})`}
            title="Camera [C]"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/15 hover:border-[#E5A93C]/60 text-[#F5F0E6] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.88)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute [M]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/15 hover:border-[#E5A93C]/60 text-[#F5F0E6] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.88)' }}
          >
            {muted ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            title="Pause [Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-white/15 hover:border-[#E5A93C]/60 text-[#F5F0E6] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.88)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="flex flex-col items-center">
        {/* Mobile Touch Pad (visible on small touch screens) */}
        <div className="md:hidden pointer-events-auto mb-2 flex items-center justify-between w-full px-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Steer Left"
              onPointerDown={() => onTouchDrive(1, 1)}
              onPointerUp={() => onTouchDrive(0, 0)}
              onPointerLeave={() => onTouchDrive(0, 0)}
              className="w-11 h-11 rounded-lg bg-[#141210]/90 border border-white/20 text-sm font-bold"
            >
              ◀
            </button>
            <button
              type="button"
              aria-label="Steer Right"
              onPointerDown={() => onTouchDrive(1, -1)}
              onPointerUp={() => onTouchDrive(0, 0)}
              onPointerLeave={() => onTouchDrive(0, 0)}
              className="w-11 h-11 rounded-lg bg-[#141210]/90 border border-white/20 text-sm font-bold"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Reverse"
              onPointerDown={() => onTouchDrive(-1, 0)}
              onPointerUp={() => onTouchDrive(0, 0)}
              onPointerLeave={() => onTouchDrive(0, 0)}
              className="w-11 h-11 rounded-lg bg-[#141210]/90 border border-white/20 text-sm font-bold"
            >
              ▼
            </button>
            <button
              type="button"
              aria-label="Drive Forward"
              onPointerDown={() => onTouchDrive(1, 0)}
              onPointerUp={() => onTouchDrive(0, 0)}
              onPointerLeave={() => onTouchDrive(0, 0)}
              className="w-11 h-11 rounded-lg bg-[#D97706] border border-white/20 text-sm font-bold"
            >
              ▲
            </button>
          </div>
        </div>

        {/* Collapse / Expand Drawer Handle */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setDockCollapsed((prev) => !prev);
          }}
          className="pointer-events-auto px-3.5 py-1 rounded-t-md border border-b-0 border-[#E5A93C]/25 text-[11px] font-medium text-[#D8D0C1] hover:text-white cursor-pointer whitespace-nowrap"
          style={{ backgroundColor: 'rgba(20, 18, 15, 0.9)' }}
        >
          {dockCollapsed ? '▴ Show Controls' : '▾ Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div
            className="pointer-events-auto w-full max-w-[940px] rounded-xl border border-[#E5A93C]/25 px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3"
            style={{ backgroundColor: 'rgba(20, 18, 15, 0.9)' }}
          >
            {/* Vehicle Switcher Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {VEHICLE_BUTTONS.map((vb) => {
                const active = hud.activeVehicleId === vb.id;
                return (
                  <button
                    key={vb.id}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSwitchVehicle(vb.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#D97706] text-white'
                        : 'bg-white/5 text-[#CFC6B4] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {vb.label} [{vb.keyHint}]
                  </button>
                );
              })}
            </div>

            {/* Active Telemetry Readouts */}
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#9E9585] mr-1">SPD</span>
                <span className="font-telemetry font-semibold text-base text-[#F5F0E6]">
                  {hud.speedKmh}
                </span>
                <span className="text-[#9E9585] ml-0.5">km/h</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[#9E9585] mr-1">RPM</span>
                <span className="font-telemetry font-semibold text-sm text-[#F5F0E6]">
                  {hud.rpm}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={lowFuel ? 'text-[#EF4444] font-semibold' : 'text-[#9E9585]'}>
                  DIESEL
                </span>
                <div className="w-16 h-2 rounded-sm bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      lowFuel ? 'bg-[#EF4444]' : 'bg-[#E5A93C]'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hud.fuelPct))}%` }}
                  />
                </div>
                <span className="font-telemetry text-[#F5F0E6]">{hud.fuelPct}%</span>
              </div>
              {hud.attachedImplement && (
                <div className="hidden md:block text-[#E5A93C] font-medium whitespace-nowrap">
                  {IMPLEMENT_LABELS[hud.attachedImplement]}
                </div>
              )}
            </div>

            {/* Primary Implement & Hydraulic Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleWork();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  hud.workActive
                    ? 'bg-[#2E7D32] text-white'
                    : 'bg-white/10 hover:bg-white/15 text-[#F5F0E6]'
                }`}
              >
                {actionLabel} [F]
              </button>

              {activeSpec.canHitch && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleHitch();
                  }}
                  className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F0E6] cursor-pointer whitespace-nowrap"
                >
                  {hud.attachedImplement ? 'Detach [E]' : 'Hitch [E]'}
                </button>
              )}

              {activeSpec.hasToolArm && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Raise Blade or Boom"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onNudgeArm(0.2);
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F0E6] cursor-pointer whitespace-nowrap"
                  >
                    Up [Q]
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Lower Blade or Boom"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onNudgeArm(-0.2);
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F5F0E6] cursor-pointer whitespace-nowrap"
                  >
                    Down [Z]
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
