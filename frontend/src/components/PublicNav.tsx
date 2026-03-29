"use client";

import { Leaf, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-[100] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
           <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shadow-lg shadow-[var(--brand)]/20 group-hover:scale-105 transition-transform">
              <Leaf size={22} className="text-[var(--brand-text)]" />
           </div>
           <span className="text-2xl font-black tracking-tighter" style={{ color: "var(--brand)" }}>ZenCash<span className="opacity-40">.</span></span>
        </Link>
        
        <div className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-xl shadow-black/[0.03]">
           <NavLink href="/#features">Recursos</NavLink>
           <NavLink href="/#pricing">Planos</NavLink>
           <NavLink href="/suporte">Suporte</NavLink>
           <div className="w-px h-6 bg-[var(--border-subtle)] mx-2" />
           <Link href="/login" className="px-5 py-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">Entrar</Link>
           <Link href="/register" className="bg-[var(--brand)] text-[var(--brand-text)] px-6 py-2 rounded-xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--brand)]/10">Abra sua Conta</Link>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-3 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-24 left-6 right-6 bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-in slide-in-from-top-4 space-y-6">
          <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-black italic">Recursos</Link>
          <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-black italic">Planos</Link>
          <Link href="/suporte" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-black italic">Suporte</Link>
          <div className="h-px bg-[var(--border-subtle)]" />
          <Link href="/login" className="block text-lg font-bold">Entrar</Link>
          <Link href="/register" className="block bg-[var(--brand)] text-[var(--brand-text)] px-8 py-4 rounded-2xl text-center text-lg font-black">Começar Agora</Link>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link href={href} className="px-5 py-2 text-sm font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:scale-105 transition-all text-[var(--text-primary)]">
      {children}
    </Link>
  );
}
