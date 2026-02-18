"use client";

import Calculator from "@/components/Calculator";

export default function CalculadoraPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Calculadora de Gastos</h1>
          <p className="page-subtitle">
            Use a calculadora para fazer cálculos rápidos de despesas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Calculator />
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card p-6 h-full">
            <h2 className="section-title mb-4">Dicas de Uso</h2>
            <ul
              className="space-y-3"
              style={{ color: "var(--text-secondary)" }}
            >
              <li className="flex items-start gap-3">
                <span className="text-accent-500 font-bold">✓</span>
                <span>
                  <strong>Operações básicas:</strong> Use +, -, *, / para somar,
                  subtrair, multiplicar e dividir
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-500 font-bold">✓</span>
                <span>
                  <strong>Decimais:</strong> Clique no ponto (.) para adicionar
                  casas decimais
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-500 font-bold">✓</span>
                <span>
                  <strong>Limpar:</strong> Clique em C para limpar o visor e
                  começar novamente
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-500 font-bold">✓</span>
                <span>
                  <strong>Desfazer:</strong> Use ← para remover o último dígito
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-500 font-bold">✓</span>
                <span>
                  <strong>Resultado:</strong> Clique em = para ver o resultado
                  da operação
                </span>
              </li>
            </ul>

            <div
              className="mt-6 p-4 rounded-xl"
              style={{
                background: "rgba(51,102,255,0.08)",
                border: "1px solid rgba(51,102,255,0.25)",
              }}
            >
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: "var(--brand)" }}
              >
                💡 Exemplo
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Para calcular o total de 3 despesas de R$ 50, R$ 30 e R$ 20:
              </p>
              <p
                className="mt-2 font-mono text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                50 + 30 + 20 = 100
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
