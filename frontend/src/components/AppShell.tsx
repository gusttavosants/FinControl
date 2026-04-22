"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import CalculatorWidget from "./CalculatorWidget";
import ChatWidget from "./ChatWidget";
import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";
import { Menu, Users, User, ArrowLeftRight, AlertTriangle, ShieldCheck, LogOut, Leaf } from "lucide-react";
import { authAPI } from "@/lib/api";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/suporte"];
const normalizePath = (p: string) => p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "auth" | "public">(
    "loading",
  );
  const [user, setUser] = useState<any>(null);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [sharedMode, setSharedMode] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSharedMode(localStorage.getItem("sharedMode") !== "false");
    }
  }, []);

  const toggleSharedMode = () => {
    const newVal = !sharedMode;
    setSharedMode(newVal);
    localStorage.setItem("sharedMode", String(newVal));
    router.refresh(); 
    window.location.reload(); 
  };

  const normalizedPath = normalizePath(pathname);
  const isPublic = PUBLIC_ROUTES.includes(normalizedPath);

  const checkAuth = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      if (status !== "auth") setStatus("loading");
      if (["/login", "/register"].includes(normalizedPath)) {
        router.replace("/");
        return;
      }

      authAPI.me({ noRedirect: true })
        .then((u) => {
          if (u) {
            setUser(u);
            setStatus("auth");
          } else {
            localStorage.removeItem("token");
            if (isPublic) setStatus("public");
            else router.replace("/login");
          }
        })
        .catch((err) => {
          console.error("Auth validation failed:", err);
          localStorage.removeItem("token");
          if (isPublic) {
            setStatus("public");
          } else {
            router.replace("/login");
          }
        });
    } else {
      if (isPublic) {
        setStatus("public");
      } else {
        setStatus("loading");
        router.replace("/login");
      }
    }
  }, [normalizedPath, router, isPublic]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "token") checkAuth();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [checkAuth]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const needsCheck = (token && status !== "auth" && status !== "loading") ||
                     (status === "loading") ||
                     (!isPublic && status === "public");
    
    if (needsCheck) {
      checkAuth();
    }
  }, [pathname, checkAuth, status, isPublic]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[var(--brand-muted)] rounded-full blur-[140px] opacity-20 animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[var(--accent-muted)] rounded-full blur-[120px] opacity-10 animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-12 group">
              <div className="absolute -inset-12 bg-[var(--brand)]/10 rounded-full blur-[80px] animate-pulse transition-all duration-1000"></div>
              <div className="relative w-28 h-28 rounded-[38px] bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-3xl flex items-center justify-center shadow-2xl transition-transform duration-700 hover:scale-105 active:scale-95">
                <Leaf size={54} strokeWidth={2.5} className="text-[var(--brand)] animate-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(var(--brand-rgb), 0.4))' }} />
              </div>
            </div>

            <div className="space-y-8 flex flex-col items-center text-center">
              <div className="space-y-1">
                <h2 className="text-4xl font-black italic tracking-tighter text-white">ZenCash</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--brand)] opacity-40">Santuário Financeiro</p>
              </div>

              <div className="w-56 h-1.5 bg-white/5 dark:bg-black/20 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--brand-muted)] via-[var(--brand)] to-[var(--brand-muted)] w-full -translate-x-full animate-loading" />
              </div>

              <p className="text-sm font-medium italic opacity-20 max-w-[200px] leading-relaxed">
                Organizando sua harmonia financeira...
              </p>
            </div>
        </div>

        <div className="absolute bottom-12 text-[9px] font-black uppercase tracking-[0.4em] opacity-10">
          Harmony is the new wealth
        </div>
      </div>
    );
  }

  // If technically on a public path but we have auth status realized, 
  // allow either public view or auth layout based on checkAuth result.
  if (status === "public" && PUBLIC_ROUTES.includes(normalizedPath) && normalizedPath !== "/") {
    return <>{children}</>;
  }
  
  // For the root itself, if we are still 'public', we show LandingPage (inside DashboardPage child)
  // BUT we don't want the Sidebar if we are purely landing page public.
  // So we handle the landing page case in the child, but the Shell here if status is auth.

  if (status === "public" && pathname === "/") {
    return <>{children}</>;
  }

  const isTrial = user?.plan === "trial";
  const trialUntil = user?.trial_until ? new Date(user.trial_until) : null;
  const isExpired = isTrial && trialUntil && trialUntil < new Date();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        collapsed={collapsedSidebar}
        setCollapsed={setCollapsedSidebar}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`flex-1 flex flex-col min-h-screen pt-14 lg:pt-0 transition-all duration-500 ease-in-out ${collapsedSidebar ? 'lg:ml-[4.5rem]' : 'lg:ml-[15.5rem]'}`}
      >
        {isExpired && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-3 flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.15em] z-50 shadow-2xl animate-in slide-in-from-top duration-700">
            <AlertTriangle size={20} className="animate-pulse" />
            <span>Seu santuário expirou. Liberte seu controle financeiro para continuar transformando sua vida.</span>
            <button 
              onClick={() => router.push("/pricing")} 
              className="px-6 py-2 bg-white text-rose-600 rounded-xl hover:bg-rose-50 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
            >
              <Leaf size={16} /> Renovar Agora
            </button>
          </div>
        )}

        {(isTrial && !isExpired) && (
          <div className="bg-gradient-to-r from-blue-600 to-[var(--brand)] text-white px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest z-50 shadow-lg">
            <ShieldCheck size={14} />
            Você está no período de Trial: {trialUntil ? `Expira em ${trialUntil.toLocaleDateString()}` : 'Acesso Grátis'}
            <button onClick={() => router.push("/pricing")} className="ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-colors">
              Explorar Planos
            </button>
          </div>
        )}

      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md border border-white/10 transition-all active:scale-90"
        style={{ background: "var(--brand)", color: "#111" }}>
        {mobileOpen ? <LogOut size={20} className="rotate-180" /> : <Menu size={22} />}
      </button>

        <header
          className="sticky top-0 z-20 hidden lg:flex items-center justify-between gap-3 px-8 py-3 backdrop-blur-md border-b"
          style={{
            background: "transparent",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-4">
             {isTrial && (
               <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg text-[10px] font-black uppercase">
                 <ShieldCheck size={12} /> Trial Mode
               </div>
             )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleSharedMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sharedMode ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[var(--brand)]'}`}
              title={sharedMode ? "Alternar para Visão Individual" : "Alternar para Visão Casal"}>
               {sharedMode ? <><Users size={14} /> Visão Casal</> : <><User size={14} /> Individual</>}
               <ArrowLeftRight size={10} className="opacity-40" />
            </button>
            <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1" />
            <GlobalSearch />
            <NotificationCenter />
          </div>
        </header>

        <div
          className="flex-1 p-4 lg:px-8 lg:py-6 w-full overflow-x-hidden"
        >
          <div className="lg:hidden flex items-center justify-between mb-8 pt-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center text-white shadow-lg">
                   <ArrowLeftRight size={16} />
                </div>
                <span className="text-sm font-black uppercase tracking-tighter">ZenCash</span>
             </div>
             <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
             </div>
          </div>

          {children}
        </div>
      </main>
      <CalculatorWidget isOpen={calculatorOpen} setIsOpen={setCalculatorOpen} />
      <ChatWidget />
    </div>
  );
}
