"use client";

import { useState } from "react";
import { Delete, RotateCcw } from "lucide-react";

export default function Calculator() {
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
        return prev / current;
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

  const handlePercentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const buttons = [
    {
      label: "C",
      onClick: handleClear,
      style: {
        gridColumn: "span 2",
        background: "rgba(249,58,74,0.15)",
        color: "#f93a4a",
      },
    },
    {
      label: "←",
      onClick: handleBackspace,
      style: { background: "rgba(249,131,7,0.15)", color: "#f98307" },
    },
    {
      label: "/",
      onClick: () => handleOperation("/"),
      style: { background: "rgba(51,102,255,0.15)", color: "var(--brand)" },
    },
    {
      label: "7",
      onClick: () => handleNumberClick("7"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "8",
      onClick: () => handleNumberClick("8"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "9",
      onClick: () => handleNumberClick("9"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "*",
      onClick: () => handleOperation("*"),
      style: { background: "rgba(51,102,255,0.15)", color: "var(--brand)" },
    },
    {
      label: "4",
      onClick: () => handleNumberClick("4"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "5",
      onClick: () => handleNumberClick("5"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "6",
      onClick: () => handleNumberClick("6"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "-",
      onClick: () => handleOperation("-"),
      style: { background: "rgba(51,102,255,0.15)", color: "var(--brand)" },
    },
    {
      label: "1",
      onClick: () => handleNumberClick("1"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "2",
      onClick: () => handleNumberClick("2"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "3",
      onClick: () => handleNumberClick("3"),
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "+",
      onClick: () => handleOperation("+"),
      style: { background: "rgba(51,102,255,0.15)", color: "var(--brand)" },
    },
    {
      label: "0",
      onClick: () => handleNumberClick("0"),
      style: {
        gridColumn: "span 2",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: ".",
      onClick: handleDecimal,
      style: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-subtle)",
      },
    },
    {
      label: "=",
      onClick: handleEquals,
      style: {
        background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
        color: "#fff",
      },
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto p-6 glass-card">
      <h2
        className="text-2xl font-bold mb-4 text-center"
        style={{ color: "var(--text-primary)" }}
      >
        Calculadora
      </h2>

      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="text-right text-4xl font-extrabold break-words overflow-hidden"
          style={{ color: "var(--text-primary)" }}
        >
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.onClick}
            className="font-bold py-4 rounded-xl text-lg transition-colors"
            style={btn.style}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
