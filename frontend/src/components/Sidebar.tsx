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
} from "lucide-react";
import { authAPI } from "@/lib/api";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/planejamento", label: "Planejamento", icon: Target },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg text-white"
        style={{
          background: "var(--sidebar-bg)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {mobileOpen ? <ChevronsLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 overflow-hidden flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{
          width: collapsed ? "5rem" : "16.5rem",
          transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
        onMouseEnter={() => !mobileOpen && setCollapsed(false)}
        onMouseLeave={() => !mobileOpen && setCollapsed(true)}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-6 overflow-hidden whitespace-nowrap">
          <div
            className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3366ff, #8b5cf6)" }}
          >
            <Wallet className="text-white" size={20} />
          </div>
          <div
            className="whitespace-nowrap"
            style={{
              opacity: collapsed ? 0 : 1,
              transition: "opacity 300ms ease",
            }}
          >
            <h1 className="text-base font-bold text-white tracking-tight">
              FinControl
            </h1>
            <p className="text-[10px] text-[var(--sidebar-text)] font-medium">
              Finanças Pessoais
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-2 px-3 overflow-y-auto">
          <p
            className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap overflow-hidden"
            style={{
              color: "var(--sidebar-text)",
              opacity: collapsed ? 0 : 0.5,
              maxHeight: collapsed ? 0 : "1.5rem",
              marginBottom: collapsed ? 0 : "0.5rem",
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-200"
                style={{
                  background: isActive
                    ? "var(--sidebar-active)"
                    : "transparent",
                  color: isActive
                    ? "var(--sidebar-text-active)"
                    : "var(--sidebar-text)",
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
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: isActive ? "var(--brand)" : "transparent",
                  }}
                >
                  <Icon
                    size={16}
                    style={{
                      color: isActive ? "#ffffff" : "var(--sidebar-text)",
                    }}
                  />
                </div>
                <span
                  className="whitespace-nowrap"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    transition: "opacity 250ms ease",
                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: "var(--brand)",
                      opacity: collapsed ? 0 : 1,
                      transition: "opacity 250ms ease",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => authAPI.logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden whitespace-nowrap"
            style={{ color: "var(--sidebar-text)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(249, 58, 74, 0.1)";
              e.currentTarget.style.color = "#f93a4a";
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
