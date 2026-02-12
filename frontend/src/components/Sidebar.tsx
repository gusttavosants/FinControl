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
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/planejamento", label: "Planejamento", icon: Wallet },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg bg-[#1a1d2e] border border-[#2a2d3e] text-white"
      >
        {mobileOpen ? <ChevronsLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 overflow-hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          bg-[#12141f] border-r border-[#2a2d3e]`}
        style={{
          width: collapsed ? "5rem" : "16rem",
          transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => !mobileOpen && setCollapsed(false)}
        onMouseLeave={() => !mobileOpen && setCollapsed(true)}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-6 border-b border-[#2a2d3e] overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[#a3e635] to-[#65a30d] rounded-xl flex items-center justify-center shadow-glow">
            <Wallet className="text-[#0b0d14]" size={22} />
          </div>
          <h1
            className="text-lg font-bold text-white whitespace-nowrap"
            style={{
              opacity: collapsed ? 0 : 1,
              transition: "opacity 300ms ease",
            }}
          >
            FinControl
          </h1>
        </div>

        {/* Nav */}
        <nav className="mt-6 px-3">
          <p
            className="px-3 mb-3 text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.15em] whitespace-nowrap overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              maxHeight: collapsed ? 0 : "1.5rem",
              marginBottom: collapsed ? 0 : "0.75rem",
              transition:
                "opacity 250ms ease, max-height 300ms ease, margin 300ms ease",
            }}
          >
            Menu
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium overflow-hidden whitespace-nowrap
                  ${
                    isActive
                      ? "bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20"
                      : "text-[#a1a7b8] hover:bg-[#1a1d2e] hover:text-white border border-transparent"
                  }`}
                title={item.label}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 ${isActive ? "text-[#a3e635]" : "text-[#6b7280]"}`}
                />
                <span
                  className="whitespace-nowrap"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    transition: "opacity 250ms ease",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#2a2d3e]">
          <button
            onClick={() => authAPI.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a1a7b8] hover:text-red-400 hover:bg-red-500/10 transition-colors overflow-hidden whitespace-nowrap"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span
              className="whitespace-nowrap"
              style={{
                opacity: collapsed ? 0 : 1,
                transition: "opacity 250ms ease",
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
