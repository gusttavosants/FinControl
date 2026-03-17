"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ChatWidget from "./ChatWidget";
import CalculatorWidget from "./CalculatorWidget";
import GlobalSearch from "./GlobalSearch";
import NotificationCenter from "./NotificationCenter";
import { Menu, Users, User, ArrowLeftRight } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "auth" | "public">(
    "loading",
  );
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
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
    router.refresh(); // Refresh data in Next.js
    window.location.reload(); // Force reload for all data components
  };

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  const checkAuth = useCallback(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token && !isPublic) {
      setStatus("loading");
      router.replace("/login");
      return;
    }

    if (token && isPublic) {
      setStatus("loading");
      router.replace("/");
      return;
    }

    if (token && !isPublic) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setStatus("auth");
          } else {
            localStorage.removeItem("token");
            router.replace("/login");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          router.replace("/login");
        });
    } else {
      setStatus("public");
    }
  }, [isPublic, router]);

  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b]">
        <div className="relative flex flex-col items-center gap-8">
          {/* Animated Background Glow */}
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand/10 rounded-full blur-[60px] animate-pulse" />
          
          {/* Logo Container */}
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-brand to-purple-500 rounded-2xl blur opacity-20 animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#131416] border border-white/5 shadow-2xl">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Text and Spinner */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand to-purple-500 rounded-full animate-[loading_1s_ease-in-out_infinite]" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
              Sincronizando
            </p>
          </div>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); width: 30%; }
            50% { width: 50%; }
            100% { transform: translateX(250%); width: 30%; }
          }
        `}</style>
      </div>
    );
  }

  if (status === "public") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar
        collapsed={collapsedSidebar}
        setCollapsed={setCollapsedSidebar}
      />
      <main
        className="flex-1 flex flex-col min-h-screen pt-14 lg:pt-0 transition-[margin] duration-500 ease-in-out"
        style={{ marginLeft: collapsedSidebar ? "" : "" }}
      >
        {/* Top Bar */}
        <header
          className="sticky top-0 z-20 hidden lg:flex items-center justify-between gap-3 px-8 py-3 backdrop-blur-md border-b"
          style={{
            background: "rgba(var(--bg-base), 0.7)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-4">
             <button onClick={() => setCollapsedSidebar(!collapsedSidebar)} 
               className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand transition-all"
               title={collapsedSidebar ? "Expandir Sidebar" : "Recolher Sidebar"}>
                <Menu size={20} />
             </button>
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

        {/* Content */}
        <div
          className="flex-1 p-4 lg:px-8 lg:py-6"
          style={{
            marginLeft: collapsedSidebar ? "4.5rem" : "15.5rem",
            transition: "margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </div>
      </main>
      <ChatWidget />
      <CalculatorWidget isOpen={calculatorOpen} setIsOpen={setCalculatorOpen} />
    </div>
  );
}
