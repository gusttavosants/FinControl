"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, TrendingDown, BarChart3, Settings,
  Wallet, LogOut, ChevronsLeft, Target, Briefcase, Table, Shield,
  User, ChevronRight, Menu,
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { useState, useEffect } from "react";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
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
      { href: "/planilhas",   label: "Planilhas",      icon: Table },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes",label: "Configurações",  icon: Settings },
      { href: "/admin",        label: "Admin",           icon: Shield, adminOnly: true },
    ],
  },
];

// icon accent colors per route
const ICON_COLORS: Record<string, string> = {
  "/":              "#10b981",
  "/receitas":      "#10b981",
  "/despesas":      "#ef4444",
  "/investimentos": "#3b82f6",
  "/planejamento":  "#818cf8",
  "/relatorios":    "#f59e0b",
  "/planilhas":     "#06b6d4",
  "/configuracoes": "#9ca3af",
  "/admin":         "#f97316",
};

interface SidebarProps { collapsed: boolean; setCollapsed: (v: boolean) => void; }

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90"
        style={{ background: "var(--brand)", color: "var(--brand-text)", border: "none" }}>
        <Menu size={24} className={`transition-transform duration-300 ${mobileOpen ? "rotate-90" : ""}`} />
      </button>

      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed top-0 left-0 h-full z-40 overflow-hidden flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-all duration-300`}
        style={{
          width: collapsed ? "4.5rem" : "15.5rem",
          transition: "width 280ms cubic-bezier(0.4,0,0.2,1)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}>

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-4 py-8 mb-4 relative transition-all duration-500 flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-2xl bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/20 flex-shrink-0 transition-transform duration-500 ${collapsed ? "rotate-[360deg]" : ""}`}>
                <Wallet size={20} />
             </div>
             <span className={`text-xl font-black uppercase tracking-wider text-brand transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-3"}`}>
               FinControl
             </span>
          </div>

          {/* Desktop Toggle Button - Floating Position */}
          <button onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-slate-400 hover:text-brand hover:scale-110 active:scale-95 transition-all z-50`}
            title={collapsed ? "Expandir" : "Recolher"}>
            <ChevronsLeft size={16} className={`transition-transform duration-500 ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2.5 py-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(i => !("adminOnly" in i && i.adminOnly) || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                {/* group label */}
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
                        title={collapsed ? item.label : undefined}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 group relative"
                        style={{
                          background: isActive ? "var(--sidebar-active-bg)" : "transparent",
                          color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                          borderLeft: isActive ? `2px solid ${iconColor}` : "2px solid transparent",
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "var(--sidebar-hover)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sidebar-text)"; } }}>
                        <Icon size={16} className="flex-shrink-0" style={{ color: isActive ? iconColor : "inherit" }} />
                        <span className="whitespace-nowrap flex-1" style={{ opacity: collapsed ? 0 : 1, transition: "opacity 200ms ease" }}>
                          {item.label}
                        </span>
                        {isActive && !collapsed && (
                          <ChevronRight size={13} style={{ color: iconColor, opacity: 0.6 }} />
                        )}
                        {/* Tooltip on collapsed */}
                        {collapsed && (
                          <span className="absolute left-full ml-2.5 px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                            style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-md)" }}>
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

        {/* ── User ── */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          {/* Avatar row */}
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1 whitespace-nowrap overflow-hidden"
            style={{ opacity: collapsed ? 0 : 1, maxHeight: collapsed ? 0 : 60, transition: "all 250ms ease" }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg,#818cf8,#6366f1)", color: "#fff" }}>
              {initials || <User size={13} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
              {userEmail && <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{userEmail}</p>}
            </div>
          </div>
          {/* Logout */}
          <button onClick={() => authAPI.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150"
            style={{ color: "var(--sidebar-text)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sidebar-text)"; }}>
            <LogOut size={15} className="flex-shrink-0" />
            <span className="whitespace-nowrap" style={{ opacity: collapsed ? 0 : 1, transition: "opacity 200ms ease" }}>Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}
