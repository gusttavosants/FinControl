"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { searchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: number;
  tipo: "receita" | "despesa";
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
    router.push(result.tipo === "receita" ? "/receitas" : "/despesas");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors w-full max-w-xs"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        <Search size={16} style={{ color: "var(--text-muted)" }} />
        <span>Buscar...</span>
        <kbd
          className="ml-auto text-xs px-1.5 py-0.5 rounded font-mono"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
          }}
        >
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => {
          setOpen(false);
          setQuery("");
          setResults([]);
        }}
      />
      <div
        className="relative w-full max-w-lg mx-4 overflow-hidden animate-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-card)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.16)",
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <Search size={20} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar despesas e receitas..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "var(--text-primary)" }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="btn-ghost"
            >
              <X size={16} />
            </button>
          )}
          <kbd
            className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--brand)",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div
              className="text-center py-8 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Nenhum resultado para "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((r) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        r.tipo === "receita"
                          ? "rgba(23,179,100,0.12)"
                          : "rgba(249,58,74,0.12)",
                      color: r.tipo === "receita" ? "#17b364" : "#f93a4a",
                    }}
                  >
                    {r.tipo === "receita" ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {r.descricao}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {r.categoria}
                      {r.data ? ` · ${formatDate(r.data)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{
                        color: r.tipo === "receita" ? "#17b364" : "#f93a4a",
                      }}
                    >
                      {formatCurrency(r.valor)}
                    </p>
                    {r.tipo === "despesa" && r.pago !== undefined && (
                      <span
                        className={`text-xs ${r.pago ? "badge badge-success" : "badge badge-warn"}`}
                      >
                        {r.pago ? "Pago" : "Pendente"}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div
              className="text-center py-8 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
