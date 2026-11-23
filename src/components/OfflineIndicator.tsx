import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-[#E5A93C]/40 px-3 py-1.5 text-xs font-medium text-[#F5F0E6] shadow-lg"
      style={{ backgroundColor: '#191714' }}
    >
      <WifiOff className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
      <span>Offline Mode · ऑफलाइन मोड सक्रिय</span>
    </div>
  );
};
