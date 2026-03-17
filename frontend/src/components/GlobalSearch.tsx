"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, TrendingUp, TrendingDown, Briefcase, Command, CreditCard, Filter, ChevronRight, Loader2, Calendar } from "lucide-react";
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
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all w-full max-w-sm group border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:border-brand/30 shadow-sm"
      >
        <Search size={16} className="text-slate-400 group-hover:text-brand transition-colors" />
        <span className="text-slate-400 font-bold">Buscar transações...</span>
        <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
           <Command size={10} className="text-slate-400" />
           <span className="text-[10px] font-black text-slate-400">K</span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-300">
        {/* Search Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
           <div className="flex items-center gap-4 mb-6">
              <Search size={22} className="text-brand" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="O que você está procurando?"
                className="flex-1 text-xl font-bold bg-transparent outline-none placeholder:opacity-20"
                style={{ color: "var(--text-primary)" }}
              />
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 <X size={20} className="opacity-40" />
              </button>
           </div>

           <div className="flex gap-2">
              {[
                { id: 'all', label: 'Tudo', icon: CreditCard },
                { id: 'receita', label: 'Receitas', icon: TrendingUp },
                { id: 'despesa', label: 'Despesas', icon: TrendingDown },
                { id: 'investimento', label: 'Ativos', icon: Briefcase }
              ].map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 dark:bg-slate-800 opacity-40 hover:opacity-100'}`}>
                   <f.icon size={12} /> {f.label}
                </button>
              ))}
           </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[50vh] overflow-y-auto p-4 scrollbar-thin">
           {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 size={32} className="animate-spin text-brand" />
                <p className="text-[10px] font-black uppercase tracking-widest">Vasculhando registros...</p>
             </div>
           ) : query.length < 2 ? (
             <div className="py-20 text-center opacity-20">
                <Command size={48} className="mx-auto mb-4" />
                <p className="text-sm font-bold">Digite algo para começar a busca global</p>
             </div>
           ) : filteredResults.length === 0 ? (
             <div className="py-20 text-center opacity-40">
                <Filter size={48} className="mx-auto mb-4" />
                <p className="text-sm font-bold">Nenhum resultado encontrado para "{query}"</p>
                <p className="text-[10px] font-black uppercase mt-1">Tente outros termos ou remova filtros</p>
             </div>
           ) : (
             <div className="space-y-1">
                {filteredResults.map((r, idx) => (
                  <button key={`${r.tipo}-${r.id}`} onClick={() => handleSelect(r)}
                    className="w-full group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all text-left">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                       r.tipo === 'receita' ? 'bg-emerald-500/10 text-emerald-500' :
                       r.tipo === 'investimento' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                     }`}>
                        {r.tipo === 'receita' ? <TrendingUp size={20} /> : r.tipo === 'investimento' ? <Briefcase size={20} /> : <TrendingDown size={20} />}
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-[9px] font-black uppercase tracking-tighter opacity-30">{r.categoria}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                           <div className="flex items-center gap-1 opacity-40">
                              <Calendar size={10} />
                              <span className="text-[9px] font-black uppercase">{r.data ? formatDate(r.data) : 'Sem data'}</span>
                           </div>
                        </div>
                        <h4 className="text-sm font-black truncate group-hover:text-brand transition-colors" style={{ color: "var(--text-primary)" }}>{r.descricao}</h4>
                     </div>

                     <div className="text-right">
                        <p className={`text-sm font-black ${
                          r.tipo === 'receita' ? 'text-emerald-500' :
                          r.tipo === 'investimento' ? 'text-blue-500' : 'text-rose-500'
                        }`}>{formatCurrency(r.valor)}</p>
                        {r.tipo === 'despesa' && (
                          <span className={`text-[9px] font-black uppercase tracking-widest ${r.pago ? 'text-emerald-500' : 'text-amber-500'}`}>
                             {r.pago ? 'Liquidado' : 'Pendente'}
                          </span>
                        )}
                     </div>
                     <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-brand" />
                  </button>
                ))}
             </div>
           )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6 justify-center">
           <div className="flex items-center gap-2 opacity-30 shadow-none">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-950 text-[9px] font-black tracking-tighter shadow-none">ENT</kbd>
              <span className="text-[9px] font-black uppercase">Abrir</span>
           </div>
           <div className="flex items-center gap-2 opacity-30 shadow-none">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-950 text-[9px] font-black tracking-tighter shadow-none">ESC</kbd>
              <span className="text-[9px] font-black uppercase">Fechar</span>
           </div>
        </div>
      </div>
    </div>
  );
}
