"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";
import CalculatorWidget from "./CalculatorWidget";
import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";
import { Menu, Users, User, ArrowLeftRight, AlertTriangle, ShieldCheck, LogOut } from "lucide-react";
import { authAPI } from "@/lib/api";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/pricing", "/suporte"];
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
      if (["/login", "/register"].includes(normalizedPath)) {
        setStatus("loading");
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
  }, [isPublic, normalizedPath, router]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "token") checkAuth();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [checkAuth]);

  useEffect(() => {
    // Only verify auth if not already verified or if pathname changes to a protected route
    if (status === "loading" || (!isPublic && status === "public")) {
      checkAuth();
    }
  }, [pathname, checkAuth, status, isPublic]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b]">
        <div className="relative flex flex-col items-center gap-8">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand/10 rounded-full blur-[60px] animate-pulse" />
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-brand to-purple-500 rounded-2xl blur opacity-20 animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#131416] border border-white/5 shadow-2xl">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand to-purple-500 rounded-full animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
              Sincronizando
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "public") {
    return <>{children}</>;
  }

  const isTrial = user?.role === "trial";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        collapsed={collapsedSidebar}
        setCollapsed={setCollapsedSidebar}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`flex-1 flex flex-col min-h-screen pt-14 lg:pt-0 transition-all duration-300 ease-in-out ${collapsedSidebar ? 'lg:ml-[4.5rem]' : 'lg:ml-[15.5rem]'}`}
      >
        {isTrial && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest z-50 shadow-lg">
            <AlertTriangle size={16} />
            Modo Demonstração: Acesso apenas para leitura. 
            <button onClick={() => router.push("/pricing")} className="ml-4 px-3 py-1 bg-white text-orange-600 rounded-lg hover:bg-white/90 transition-colors">
              Liberar Acesso Total
            </button>
          </div>
        )}

        {/* Mobile toggle - Standard Hamburger on Top Left or Floating as requested but better styled */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-md border border-white/10 transition-all active:scale-90"
        style={{ background: "rgba(var(--brand-rgb, 51, 102, 255), 0.9)", color: "#fff" }}>
        {mobileOpen ? <LogOut size={20} className="rotate-180" /> : <Menu size={22} />}
      </button>

        <header
          className="sticky top-0 z-20 hidden lg:flex items-center justify-between gap-3 px-8 py-3 backdrop-blur-md border-b"
          style={{
            background: "rgba(var(--bg-base), 0.7)",
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sharedMode ? 'bg-brand/10 text-brand' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand'}`}
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
          className="flex-1 p-4 lg:px-8 lg:py-6 w-full overflow-x-hidden min-h-screen"
        >
          {/* Mobile Header Overlay - Appears only on mobile if scrolled or just always for navigation */}
          <div className="lg:hidden flex items-center justify-between mb-8 pt-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-lg">
                   <ArrowLeftRight size={16} />
                </div>
                <span className="text-sm font-black uppercase tracking-tighter">FinControl</span>
             </div>
             <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationCenter />
             </div>
          </div>

          {children}
        </div>
      </main>
      <ChatWidget />
      <CalculatorWidget isOpen={calculatorOpen} setIsOpen={setCalculatorOpen} />
    </div>
  );
}
