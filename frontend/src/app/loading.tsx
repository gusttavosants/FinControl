"use client";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b]">
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Background Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-brand/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[80px] animate-pulse delay-700" />

        {/* Logo Container */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand via-purple-500 to-brand rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-[#131416] border border-white/5 shadow-2xl overflow-hidden">
            {/* Inner Animated Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-transparent to-purple-500/10" />
            
            <svg
              className="w-10 h-10 text-white relative z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            {/* Scanning Effect */}
            <div className="absolute inset-0 w-full h-1/2 bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full animate-[scan_2s_linear_infinite]" />
          </div>
        </div>

        {/* Text and Spinner */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
              FinControl
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-r from-brand to-purple-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em] animate-pulse">
              Preparando ambiente
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 50%; }
          100% { transform: translateX(250%); width: 30%; }
        }
        @keyframes tilt {
          0%, 50%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
