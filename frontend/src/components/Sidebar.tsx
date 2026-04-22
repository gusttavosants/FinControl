"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, TrendingDown, BarChart3, Settings,
  Wallet, LogOut, ChevronsLeft, Target, Briefcase, Table, StickyNote, Shield,
  User, ChevronRight, Menu, HelpCircle, Leaf, Bot,
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { useState, useEffect } from "react";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
      { href: "/chat",        label: "ZenBot IA",      icon: Bot },
      { href: "/receitas",    label: "Receitas",       icon: TrendingUp },
      { href: "/despesas",    label: "Despesas",       icon: TrendingDown },
      { href: "/investimentos",label: "Investimentos", icon: Briefcase },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { href: "/planejamento",label: "Planejamento",   icon: Target },
      { href: "/relatorios",  label: "Relatórios",     icon: BarChart3 },
      { href: "/notas",       label: "Notas",          icon: StickyNote },
      { href: "/planilhas",   label: "Planilhas",      icon: Table },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes",label: "Configurações",  icon: Settings },
      { href: "/suporte",      label: "Suporte",        icon: HelpCircle },
      { href: "/admin",        label: "Admin",           icon: Shield, adminOnly: true },
    ],
  },
];

const ICON_COLORS: Record<string, string> = {
  "/":              "#81A18B", // Sage
  "/chat":          "#10B981", // Emerald Zen
  "/receitas":      "#81A18B",
  "/despesas":      "#E2725B", // Terracotta-ish for alert
  "/investimentos": "#2D4A3E", // Deep Forest
  "/planejamento":  "#A3B18A", // Moss
  "/relatorios":    "#588157",
  "/planilhas":     "#3A5A40",
  "/configuracoes": "#9ca3af",
  "/admin":         "#f97316",
  "/suporte":       "#81A18B",
};

interface SidebarProps { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role === "admin") setIsAdmin(true);
          if (user.nome || user.name) setUserName(user.nome || user.name);
          if (user.email) setUserEmail(user.email);
          return;
        } catch {}
      }
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const user = await res.json();
            if (user.role === "admin") setIsAdmin(true);
            if (user.nome || user.name) setUserName(user.nome || user.name);
            if (user.email) setUserEmail(user.email);
            localStorage.setItem("user", JSON.stringify(user));
          }
        }
      } catch {}
    };
    checkAdmin();
  }, []);

  const initials = userName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-all duration-300`}
        style={{
          width: collapsed ? "4.5rem" : "15.5rem",
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}>

        <div className={`flex items-center gap-3 mb-6 relative transition-all duration-500 flex-shrink-0 border-b border-white/5 mx-2 ${collapsed ? "px-0 justify-center py-10" : "pl-4 pr-10 py-10"}`}>
          <div className="flex items-center gap-4">
             <div className={`w-11 h-11 rounded-[22px] bg-[var(--brand)] flex items-center justify-center text-white shadow-2xl shadow-[var(--brand)]/30 flex-shrink-0 transition-all duration-700 ${collapsed ? "rotate-[360deg] scale-90" : ""}`}>
                <Leaf size={22} strokeWidth={2.5} />
             </div>
             <span className={`text-2xl font-black italic tracking-tighter text-white transition-all duration-500 whitespace-nowrap pr-2 ${collapsed ? "w-0 opacity-0 ml-0 overflow-hidden" : "w-auto opacity-100 ml-1 overflow-visible"}`}>
               ZenCash
             </span>
          </div>

          <button onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl text-white/40 hover:text-white hover:scale-110 active:scale-95 transition-all z-50 ${collapsed ? "-right-4" : "-right-3"}`}
          >
            <ChevronsLeft size={16} className={`transition-transform duration-500 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(i => !("adminOnly" in i && i.adminOnly) || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden"
                  style={{ opacity: collapsed ? 0 : 1, maxHeight: collapsed ? 0 : "1.5rem", transition: "all 200ms ease", color: "var(--text-muted)" }}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const iconColor = ICON_COLORS[item.href] || "var(--text-muted)";
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                          ${isActive ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text-active)] border-l-2' : 'text-[var(--sidebar-text)] border-l-2 border-l-transparent hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]'}`}
                        style={{ borderLeftColor: isActive ? iconColor : "transparent" }}>
                        <Icon size={16} className="flex-shrink-0" style={{ color: isActive ? iconColor : "inherit" }} />
                        <span className="flex-1" style={{ opacity: collapsed ? 0 : 1, transition: "opacity 200ms ease" }}>
                          {item.label}
                        </span>
                        {isActive && !collapsed && <ChevronRight size={13} style={{ color: iconColor, opacity: 0.6 }} />}
                        {collapsed && (
                          <span className="absolute left-full ml-2.5 px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-md">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 flex-shrink-0 border-t border-[var(--sidebar-border)]">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg mb-1 transition-all duration-250 ${collapsed ? "opacity-0 invisible max-h-0" : "opacity-100 visible max-h-20"}`}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-brand to-purple-600 text-white">
              {initials || <User size={13} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-[var(--text-primary)]">{userName}</p>
              {userEmail && <p className="text-[11px] truncate text-[var(--text-muted)]">{userEmail}</p>}
            </div>
          </div>
          <button onClick={() => authAPI.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--sidebar-text)] hover:bg-rose-500/10 hover:text-rose-500 transition-all">
            <LogOut size={15} />
            <span style={{ opacity: collapsed ? 0 : 1, transition: "opacity 200ms ease" }}>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}
