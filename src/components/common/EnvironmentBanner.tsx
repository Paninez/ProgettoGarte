import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EnvironmentBannerProps {
  isProd: boolean;
}

export function EnvironmentBanner({ isProd }: EnvironmentBannerProps) {
  if (isProd) return null;
  
  return (
    <div className="bg-amber-500 text-amber-950 font-bold px-4 py-2 text-center text-xs flex items-center justify-center space-x-2 border-b border-amber-600/20 shadow-xs z-50 shrink-0">
      <ShieldAlert className="h-4.5 w-4.5 text-amber-950 shrink-0" />
      <span>AMBIENTE DI SVILUPPO (DEV) ATTIVO - I dati salvati qui non influiscono sul database reale di produzione.</span>
    </div>
  );
}
