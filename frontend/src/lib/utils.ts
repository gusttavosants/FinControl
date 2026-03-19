export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#a855f7", "#d946ef", "#64748b",
];

export function maskCurrency(value: string | number): string {
  let numValue = 0;
  if (typeof value === "number") {
    numValue = value;
  } else if (typeof value === "string") {
    // Treat the string as a float representation, which is what is stored in the form state
    numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
  }
  
  // Need to safely handle zero as well
  if (numValue === 0) return "0,00";
  
  // Convert the accurate float to cents and format
  const val = Math.round(numValue * 100).toString().padStart(3, "0");
  const integerPart = val.slice(0, -2);
  const decimalPart = val.slice(-2);
  
  // Format integer part with dots for thousands
  const formattedInteger = parseInt(integerPart || "0", 10).toLocaleString("pt-BR");
  
  return `${formattedInteger},${decimalPart}`;
}


export function parseCurrencyToNumber(value: string): number {
  if (!value) return 0;
  // Remove all non-digits, then divide by 100
  const cleanValue = value.replace(/\D/g, "");
  return parseInt(cleanValue) / 100;
}
