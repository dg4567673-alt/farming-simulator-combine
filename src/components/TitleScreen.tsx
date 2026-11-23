import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Subtle left-side scrim for crisp typography contrast over live 3D village flyover */}
      <div
        className="absolute inset-y-0 left-0 w-full md:w-[58%] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(16, 14, 11, 0.88) 0%, rgba(16, 14, 11, 0.62) 55%, rgba(16, 14, 11, 0) 100%)',
        }}
      />

      {/* Main Left-Third Editorial Title Lockup */}
      <div className="relative z-10 flex-1 flex items-center px-8 md:px-16 max-w-2xl">
        <div className="pointer-events-auto">
          {/* Custom Inline SVG Emblem: Tractor Wheel + Golden Wheat Crest */}
          <div className="mb-5 flex items-center gap-3.5">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#E5A93C"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
              <circle cx="24" cy="24" r="13" stroke="#F5F0E6" strokeWidth="2" />
              <circle cx="24" cy="24" r="4.5" fill="#E5A93C" />
              <path
                d="M24 4V11M24 37V44M4 24H11M37 24H44"
                stroke="#E5A93C"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm font-medium tracking-wide text-[#E5A93C]">
              शुभम फार्मिंग सिम्युलेटर
            </span>
          </div>

          <h1
            className="font-display text-5xl md:text-6xl font-bold tracking-tight text-[#F5F0E6] leading-[1.03]"
            style={{ textWrap: 'balance' }}
          >
            Shubham Farming Simulator
          </h1>

          <p className="mt-4 text-base md:text-lg text-[#D8D0C1] max-w-lg leading-relaxed">
            Plow alluvial fields, sow seeds, irrigate crops, run the combine harvester, drive JCB
            and bulldozer, and trade grain at the village mandi.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-7 py-3.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] active:scale-[0.99] text-[#FFFDF8] font-semibold text-base tracking-wide shadow-lg transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24]"
            >
              Start Farming · खेती शुरू करें
            </button>
            <PWAInstallButton variant="title" />
          </div>
        </div>
      </div>

      {/* Flat Borderless Control Hint Line in Bottom Safe Margin */}
      <div
        className="relative z-10 px-8 md:px-16 pb-6 pt-10"
        style={{
          background:
            'linear-gradient(0deg, rgba(16, 14, 11, 0.82) 0%, rgba(16, 14, 11, 0) 100%)',
        }}
      >
        <p className="text-xs md:text-sm text-[#E7DFCF] hud-stroke">
          WASD Drive · F Work Implement · E Hitch/Attach · V Switch Vehicle · C Camera · B Mandi ·
          R Refuel/Unload · Esc Pause
        </p>
      </div>
    </div>
  );
};
