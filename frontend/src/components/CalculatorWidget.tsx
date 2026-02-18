"use client";

import { useState } from "react";
import { Calculator, X, Delete } from "lucide-react";

interface CalculatorWidgetProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function CalculatorWidget({
  isOpen,
  setIsOpen,
}: CalculatorWidgetProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const handleNumberClick = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case "+":
        return prev + current;
      case "-":
        return prev - current;
      case "*":
        return prev * current;
      case "/":
        return current !== 0 ? prev / current : 0;
      case "%":
        return (prev * current) / 100;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #3366ff, #8b5cf6)" }}
        title="Calculadora"
      >
        <Calculator size={24} />
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calculator Panel */}
          <div
            className="fixed bottom-24 right-6 z-50 w-80 p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-semibold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Calculator size={18} style={{ color: "var(--brand)" }} />
                Calculadora
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Display */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="text-right text-3xl font-extrabold font-mono break-words overflow-hidden max-h-16"
                style={{ color: "var(--text-primary)" }}
              >
                {display}
              </div>
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                onClick={handleClear}
                className="col-span-2 font-semibold py-3 rounded-xl transition-colors"
                style={{ background: "rgba(249,58,74,0.12)", color: "#f93a4a" }}
              >
                C
              </button>
              <button
                onClick={handleBackspace}
                className="font-semibold py-3 rounded-xl transition-colors flex items-center justify-center"
                style={{ background: "rgba(249,131,7,0.12)", color: "#f98307" }}
              >
                <Delete size={18} />
              </button>
              <button
                onClick={() => handleOperation("/")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "rgba(51,102,255,0.12)",
                  color: "var(--brand)",
                }}
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                onClick={() => handleNumberClick("7")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                7
              </button>
              <button
                onClick={() => handleNumberClick("8")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                8
              </button>
              <button
                onClick={() => handleNumberClick("9")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                9
              </button>
              <button
                onClick={() => handleOperation("*")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "rgba(51,102,255,0.12)",
                  color: "var(--brand)",
                }}
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                onClick={() => handleNumberClick("4")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                4
              </button>
              <button
                onClick={() => handleNumberClick("5")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                5
              </button>
              <button
                onClick={() => handleNumberClick("6")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                6
              </button>
              <button
                onClick={() => handleOperation("-")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "rgba(51,102,255,0.12)",
                  color: "var(--brand)",
                }}
              >
                −
              </button>

              {/* Row 4 */}
              <button
                onClick={() => handleNumberClick("1")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                1
              </button>
              <button
                onClick={() => handleNumberClick("2")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                2
              </button>
              <button
                onClick={() => handleNumberClick("3")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                3
              </button>
              <button
                onClick={() => handleOperation("+")}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "rgba(51,102,255,0.12)",
                  color: "var(--brand)",
                }}
              >
                +
              </button>

              {/* Row 5 */}
              <button
                onClick={() => handleNumberClick("0")}
                className="col-span-2 font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                0
              </button>
              <button
                onClick={handleDecimal}
                className="font-semibold py-3 rounded-xl transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                .
              </button>
              <button
                onClick={handleEquals}
                className="text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
                }}
              >
                =
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
