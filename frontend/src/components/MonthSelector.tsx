"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MESES } from "@/lib/utils";

interface MonthSelectorProps {
  mes: number;
  ano: number;
  onChange: (mes: number, ano: number) => void;
}

export default function MonthSelector({
  mes,
  ano,
  onChange,
}: MonthSelectorProps) {
  const prev = () => {
    if (mes === 1) onChange(12, ano - 1);
    else onChange(mes - 1, ano);
  };

  const next = () => {
    if (mes === 12) onChange(1, ano + 1);
    else onChange(mes + 1, ano);
  };

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <Calendar size={14} style={{ color: "var(--brand)" }} />
      <button
        onClick={prev}
        className="p-1 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <ChevronLeft size={16} />
      </button>
      <span
        className="text-sm font-semibold min-w-[130px] text-center"
        style={{ color: "var(--text-primary)" }}
      >
        {MESES[mes - 1]} {ano}
      </span>
      <button
        onClick={next}
        className="p-1 rounded-lg transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
