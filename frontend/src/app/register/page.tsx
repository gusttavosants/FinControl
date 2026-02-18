"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, UserPlus, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { authAPI } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (senha !== confirmSenha) {
      setError("As senhas não coincidem");
      return;
    }

    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.register(nome, email, senha);
      localStorage.setItem("token", data.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="absolute inset-0 bg-mesh-1 dark:bg-mesh-dark pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
              boxShadow: "0 8px 32px rgba(51,102,255,0.25)",
            }}
          >
            <Wallet className="text-white" size={26} />
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            FinControl
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Crie sua conta gratuita
          </p>
        </div>

        <div className="glass-card p-8">
          <h2
            className="text-lg font-bold mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Criar conta
          </h2>

          {error && (
            <div
              className="badge-danger text-sm px-4 py-3 rounded-xl mb-4"
              style={{ background: "rgba(249,58,74,0.08)" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Nome
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-field"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                value={confirmSenha}
                onChange={(e) => setConfirmSenha(e.target.value)}
                className="input-field"
                placeholder="Repita a senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="font-semibold hover:underline"
                style={{ color: "var(--brand)" }}
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
