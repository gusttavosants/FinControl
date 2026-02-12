"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="flex items-center gap-3 bg-[#1a1d2e] rounded-xl px-4 py-2 border border-[#2a2d3e]">
      <button
        onClick={prev}
        className="p-1 hover:bg-[#242740] rounded-lg transition-colors"
      >
        <ChevronLeft size={18} className="text-[#a1a7b8]" />
      </button>
      <span className="text-sm font-semibold text-white min-w-[140px] text-center">
        {MESES[mes - 1]} {ano}
      </span>
      <button
        onClick={next}
        className="p-1 hover:bg-[#242740] rounded-lg transition-colors"
      >
        <ChevronRight size={18} className="text-[#a1a7b8]" />
      </button>
    </div>
  );
}
