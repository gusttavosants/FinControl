"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Wallet,
  Menu,
  LogOut,
  ChevronsLeft,
  Target,
  Briefcase,
  Table,
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/investimentos", label: "Investimentos", icon: Briefcase },
  { href: "/planejamento", label: "Planejamento", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/planilhas", label: "Planilhas", icon: Table },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md shadow-sm border"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          color: "var(--text-primary)"
        }}
      >
        {mobileOpen ? <ChevronsLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 overflow-hidden flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300`}
        style={{
          width: collapsed ? "4.5rem" : "16rem",
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
        onMouseEnter={() => !mobileOpen && collapsed && setCollapsed(false)}
        onMouseLeave={() => !mobileOpen && !collapsed && setCollapsed(false)} // Let's keep it fixed if user uses toggle? Nah, the previous logic expanded on hover. Actually, if we set default collapsed to false, let's remove hover expansion to make it a solid SaaS sidebar.
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-5 py-6 whitespace-nowrap overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-black text-white dark:bg-white dark:text-black flex-shrink-0">
            <Wallet size={16} strokeWidth={2.5} />
          </div>
          <div
            className="whitespace-nowrap flex-1 flex items-center justify-between"
            style={{
              opacity: collapsed ? 0 : 1,
              transition: "opacity 200ms ease",
            }}
          >
            <div>
              <h1 className="text-[15px] font-bold tracking-tight text-black dark:text-white leading-tight">
                FinControl
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Página Inicial
              </p>
            </div>
            {/* Collapse toggle button for desktop */}
            <button 
              onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
              className="text-slate-400 hover:text-black dark:hover:text-white hidden lg:flex"
            >
              <ChevronsLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin">
          <p
            className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden text-slate-400 dark:text-slate-500"
            style={{
              opacity: collapsed ? 0 : 1,
              maxHeight: collapsed ? 0 : "1.5rem",
              transition: "all 200ms ease",
            }}
          >
            Menu
          </p>

          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors"
                  style={{
                    background: isActive ? "var(--sidebar-active)" : "transparent",
                    color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  }}
                  title={item.label}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--sidebar-hover)";
                      e.currentTarget.style.color = "var(--sidebar-text-active)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--sidebar-text)";
                    }
                  }}
                >
                  <Icon
                    size={16}
                    className="flex-shrink-0"
                    style={{
                      color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                    }}
                  />
                  <span
                    className="whitespace-nowrap"
                    style={{
                      opacity: collapsed ? 0 : 1,
                      transition: "opacity 200ms ease",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer Area */}
        <div className="p-3 border-t border-[var(--sidebar-border)]">
          <button
            onClick={() => authAPI.logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors"
            style={{ color: "var(--sidebar-text)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--sidebar-text)";
            }}
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span
              className="whitespace-nowrap"
              style={{
                opacity: collapsed ? 0 : 1,
                transition: "opacity 200ms ease",
              }}
            >
              Sair da conta
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
