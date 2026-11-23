import React, { useState } from 'react';
import { Download, ExternalLink, Copy, Check, X, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'title' | 'hud' | 'modal';
}

const FALLBACK_APP_URL =
  'https://ais-pre-leuijrl4klub6r7ufeqhow-347421123026.asia-northeast1.run.app';

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'title' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const standaloneUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : FALLBACK_APP_URL;

  const handleAction = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(standaloneUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const buttonClass =
    variant === 'hud'
      ? 'h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-[#E5A93C]/60 hover:border-[#E5A93C] text-[11px] sm:text-xs font-semibold text-[#FBBF24] flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors'
      : variant === 'modal'
        ? 'w-full py-2.5 rounded-lg bg-[#E5A93C]/15 hover:bg-[#E5A93C]/25 border border-[#E5A93C]/35 text-sm font-semibold text-[#FBBF24] flex items-center justify-center gap-2 cursor-pointer transition-colors'
        : 'px-5 py-3.5 rounded-lg bg-[#191714]/90 hover:bg-[#24201B] border border-[#E5A93C]/45 text-[#F5F0E6] font-semibold text-sm md:text-base tracking-wide shadow-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24]';

  const buttonStyle =
    variant === 'hud' ? { backgroundColor: 'rgba(32, 24, 14, 0.92)' } : undefined;

  return (
    <>
      <button
        type="button"
        tabIndex={variant === 'hud' ? -1 : undefined}
        aria-label="Download or Install Shubham Farming Simulator App"
        title="Install App / ऐप डाउनलोड करें"
        onClick={handleAction}
        className={buttonClass}
        style={buttonStyle}
      >
        <Download className="w-4 h-4 text-[#E5A93C] shrink-0" />
        <span>
          {variant === 'hud' ? 'Install App' : 'Install App · डाउनलोड करें'}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto"
          onClick={() => setShowGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className="w-full max-w-lg rounded-xl border border-[#E5A93C]/35 p-6 shadow-2xl text-[#F5F0E6]"
            style={{ backgroundColor: '#191714' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pwa-install-title" className="font-display text-2xl md:text-3xl font-bold text-[#F5F0E6]">
                  Download &amp; Install Game App
                </h2>
                <p className="text-sm text-[#E5A93C] mt-0.5">
                  फोन या कंप्यूटर में होम स्क्रीन पर सेव करें (ऑफलाइन भी चलेगा)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Install Guide"
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#F5F0E6] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInIframe ? (
              <div className="mt-4 rounded-lg border border-[#E5A93C]/30 bg-[#E5A93C]/10 p-3.5 text-sm text-[#EFE8DA]">
                <p className="font-semibold text-[#FBBF24]">
                  अभी आप Preview बॉक्स के अंदर हैं:
                </p>
                <p className="mt-1 text-xs md:text-sm text-[#D8D0C1] leading-relaxed">
                  नीचे <strong>&ldquo;Open in Browser&rdquo;</strong> दबाएँ या <strong>Copy Link</strong> करके सीधे <strong>Chrome</strong> ऐप में खोलें।
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-[#E5A93C]/30 bg-[#E5A93C]/10 p-3.5 text-sm text-[#EFE8DA]">
                <p className="font-semibold text-[#FBBF24]">
                  अगर ऊपर बाईं तरफ ✕ (Cross) दिख रहा है:
                </p>
                <p className="mt-1 text-xs md:text-sm text-[#D8D0C1] leading-relaxed">
                  यह अभी इन-ऐप विंडो है — यहाँ ⋮ मेन्यू में Install नहीं दिखता। पहले ऊपर दाईं तरफ{' '}
                  <strong>⋮ (3-dot)</strong> दबाकर <strong>&ldquo;Open in Chrome&rdquo;</strong> चुनें।
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              {isInIframe && (
                <a
                  href={standaloneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>Open in Browser · ब्राउज़र में खोलें</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className={`${isInIframe ? '' : 'flex-1 '}py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[#F5F0E6] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#4ADE80]" />
                    <span>Link Copied! · लिंक कॉपी हो गया</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link · लिंक कॉपी करें</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs md:text-sm text-[#D8D0C1]">
              {isIOS ? (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-[#F5F0E6] mb-1.5">
                    <Smartphone className="w-4 h-4 text-[#E5A93C]" />
                    <span>iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[#CFC6B4]">
                    <li>Safari में नीचे <strong>Share (⬆)</strong> बटन दबाएँ।</li>
                    <li>थोड़ा नीचे स्क्रॉल करके <strong>Add to Home Screen</strong> चुनें।</li>
                    <li>ऊपर <strong>Add</strong> दबाएँ — गेम ऐप की तरह सेव हो जाएगा।</li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-[#F5F0E6] mb-1.5">
                      <Smartphone className="w-4 h-4 text-[#E5A93C]" />
                      <span>Android Phone (Chrome में डाउनलोड तरीका):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-[#CFC6B4]">
                      <li>
                        अगर ऊपर बाईं ओर <strong>✕</strong> दिख रहा है, तो पहले दाईं ओर <strong>⋮ (3-dot)</strong> दबाकर <strong>Open in Chrome</strong> चुनें (या ऊपर से <strong>Copy Link</strong> करके Chrome ऐप में पेस्ट करें)।
                      </li>
                      <li>
                        असली <strong>Chrome</strong> में खुलने पर ऊपर <strong>⋮ (3-dot)</strong> दबाएँ।
                      </li>
                      <li>
                        अब लिस्ट में <strong>Add to Home screen</strong> या <strong>Install app</strong> दिखेगा — उस पर टैप करें!
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-lg bg-white/5 border border-white/10 p-3.5">
                    <div className="flex items-center gap-2 font-semibold text-[#F5F0E6] mb-1.5">
                      <Monitor className="w-4 h-4 text-[#E5A93C]" />
                      <span>Laptop / PC (Chrome or Edge):</span>
                    </div>
                    <p className="text-[#CFC6B4]">
                      Address Bar (URL बॉक्स) के दाईं तरफ बने <strong>Install (⬇)</strong> आइकन पर क्लिक करें।
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-[#F5F0E6] cursor-pointer"
            >
              Close · बंद करें
            </button>
          </div>
        </div>
      )}
    </>
  );
};
