"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, TrendingUp, TrendingDown, Briefcase, Command, CreditCard, Filter, ChevronRight, Loader2, Calendar, Sparkles } from "lucide-react";
import { searchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: number;
  tipo: "receita" | "despesa" | "investimento";
  descricao: string;
  categoria: string;
  valor: number;
  data: string | null;
  pago?: boolean;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchAPI.search(value);
        setResults(data);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(
      result.tipo === "receita"
        ? "/receitas"
        : result.tipo === "investimento"
          ? "/investimentos"
          : "/despesas",
    );
  };

  const filteredResults = results.filter(r => activeFilter === "all" || r.tipo === activeFilter);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all w-full max-w-sm group border border-white/10 bg-white/5 dark:bg-black/20 hover:bg-white/10 dark:hover:bg-black/40 hover:border-[var(--brand)]/30 backdrop-blur-md shadow-sm"
      >
        <Search size={16} className="text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors" />
        <span className="text-[var(--text-muted)] font-bold">Buscar no Santuário...</span>
        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 dark:bg-black/20 border border-white/5">
           <Command size={10} className="text-[var(--text-muted)]" />
           <span className="text-[10px] font-black text-[var(--text-muted)]">K</span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-white/80 dark:bg-black/80 rounded-[44px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-3xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-10 duration-500">
        {/* Search Header */}
        <div className="p-8 pb-4">
           <div className="flex items-center gap-6 mb-8 group">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] group-focus-within:scale-110 transition-transform duration-500 shadow-xl shadow-[var(--brand)]/10">
                <Search size={22} strokeWidth={3} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Revelar transações..."
                className="flex-1 text-2xl font-black bg-transparent outline-none placeholder:opacity-20 tracking-tighter"
                style={{ color: "var(--text-primary)" }}
              />
              <button onClick={() => setOpen(false)} className="p-3 hover:bg-white/10 dark:hover:bg-black/20 rounded-2xl transition-all active:scale-95">
                 <X size={20} className="opacity-40" />
              </button>
           </div>

           <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'Tudo', icon: CreditCard },
                { id: 'receita', label: 'Receitas', icon: TrendingUp },
                { id: 'despesa', label: 'Despesas', icon: TrendingDown },
                { id: 'investimento', label: 'Ativos', icon: Briefcase }
              ].map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f.id ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-2xl shadow-[var(--brand)]/40 scale-105' : 'bg-black/5 dark:bg-white/5 opacity-40 hover:opacity-100'}`}>
                   <f.icon size={12} strokeWidth={3} /> {f.label}
                </button>
              ))}
           </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[50vh] overflow-y-auto p-4 px-6 scrollbar-none">
           {loading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-6 animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--brand)]/20 blur-2xl rounded-full" />
                  <Loader2 size={40} className="animate-spin text-[var(--brand)] relative z-10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Consultando o Santuário...</p>
             </div>
           ) : query.length < 2 ? (
             <div className="py-24 text-center">
                <div className="w-20 h-20 rounded-[28px] bg-black/5 dark:bg-white/5 mx-auto mb-6 flex items-center justify-center opacity-20">
                  <Sparkles size={32} />
                </div>
                <p className="text-xl font-black tracking-tight opacity-20">Encontre a paz em seus dados</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-10">Use CTRL + K de qualquer lugar</p>
             </div>
           ) : filteredResults.length === 0 ? (
             <div className="py-24 text-center opacity-40">
                <Filter size={48} strokeWidth={1} className="mx-auto mb-6" />
                <p className="text-lg font-black tracking-tight leading-tight">Nenhum registro encontrado para <span className="text-[var(--brand)] italic">"{query}"</span></p>
                <div className="mt-4 flex items-center justify-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-ping" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Tente outro termo</p>
                </div>
             </div>
           ) : (
             <div className="space-y-2 mb-4">
                {filteredResults.map((r, idx) => (
                   <button key={`${r.tipo}-${r.id}`} onClick={() => handleSelect(r)}
                    className="w-full group flex items-center gap-5 p-5 bg-white/5 dark:bg-black/20 hover:bg-[var(--brand)]/10 rounded-[32px] border border-white/5 transition-all duration-300 text-left active:scale-[0.98]">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-xl ${
                        r.tipo === 'receita' ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10' :
                        r.tipo === 'investimento' ? 'bg-blue-500/10 text-blue-500 shadow-blue-500/10' : 'bg-rose-500/10 text-rose-500 shadow-rose-500/10'
                      }`}>
                         {r.tipo === 'receita' ? <TrendingUp size={24} /> : r.tipo === 'investimento' ? <Briefcase size={24} /> : <TrendingDown size={24} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{r.categoria}</span>
                            <div className="flex items-center gap-1.5 opacity-30 text-[9px] font-black uppercase">
                               <Calendar size={10} />
                               <span>{r.data ? formatDate(r.data) : 'Sem data'}</span>
                            </div>
                         </div>
                         <h4 className="text-lg font-black tracking-tight truncate group-hover:text-[var(--brand)] transition-colors overflow-hidden" style={{ color: "var(--text-primary)" }}>{r.descricao}</h4>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                         <p className={`text-xl font-black italic tracking-tighter ${
                           r.tipo === 'receita' ? 'text-emerald-500' :
                           r.tipo === 'investimento' ? 'text-blue-500' : 'text-rose-500'
                         }`}>{formatCurrency(r.valor)}</p>
                         {r.tipo === 'despesa' && (
                           <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${r.pago ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                              {r.pago ? 'PAGO' : 'PENDENTE'}
                           </span>
                         )}
                      </div>
                   </button>
                ))}
             </div>
           )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-6 bg-black/5 dark:bg-white/5 border-t border-white/5 flex items-center gap-8 justify-center">
           <div className="flex items-center gap-2 opacity-30">
              <kbd className="px-2 py-1 rounded-[8px] bg-white dark:bg-black border border-white/10 text-[10px] font-black shadow-2xl">ENTER</kbd>
              <span className="text-[9px] font-black uppercase tracking-widest">Acessar</span>
           </div>
           <div className="flex items-center gap-2 opacity-30">
              <kbd className="px-2 py-1 rounded-[8px] bg-white dark:bg-black border border-white/10 text-[10px] font-black shadow-2xl">ESC</kbd>
              <span className="text-[9px] font-black uppercase tracking-widest">Fechar</span>
           </div>
        </div>
      </div>
    </div>
  );
}
