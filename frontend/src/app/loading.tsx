"use client";

import { Leaf } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* Atmosphere - Same as AppShell/Landing for consistency */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[var(--brand-muted)] rounded-full blur-[140px] opacity-20 animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[var(--accent-muted)] rounded-full blur-[120px] opacity-10 animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12 group">
            {/* Energy Ring */}
            <div className="absolute -inset-12 bg-[var(--brand)]/10 rounded-full blur-[80px] animate-pulse transition-all duration-1000"></div>
            
            {/* Logo Card */}
            <div className="relative w-28 h-28 rounded-[38px] bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-3xl flex items-center justify-center shadow-2xl transition-transform duration-700 hover:scale-105 active:scale-95">
              <Leaf size={54} strokeWidth={2.5} className="text-[var(--brand)] animate-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(var(--brand-rgb), 0.4))' }} />
            </div>
          </div>

          <div className="space-y-8 flex flex-col items-center text-center">
            <div className="space-y-1">
              <h2 className="text-4xl font-black italic tracking-tighter text-white">ZenCash</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--brand)] opacity-40 uppercase">Cultivando sua paz</p>
            </div>

            <div className="w-56 h-1.5 bg-white/5 dark:bg-black/20 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--brand-muted)] via-[var(--brand)] to-[var(--brand-muted)] w-full -translate-x-full animate-loading" />
            </div>

            <p className="text-sm font-medium italic opacity-20 max-w-[200px] leading-relaxed">
              Preparando o ambiente...
            </p>
          </div>
      </div>

      {/* Footer Credit */}
      <div className="absolute bottom-12 text-[9px] font-black uppercase tracking-[0.4em] opacity-10">
        Harmony is the new wealth
      </div>
    </div>
  );
}
