"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, UserPlus, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { authAPI, paymentAPI } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState("free"); // "free" = Basico R$ 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (senha !== confirmSenha) return setError("As senhas não coincidem");
    if (senha.length < 6) return setError("A senha deve ter pelo menos 6 caracteres");
    if (!plan) return setError("Selecione um plano para continuar");
    setLoading(true);
    try {
      const data = await authAPI.register(nome, email, senha, plan);
      localStorage.setItem("token", data.access_token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      
      // Open WhatsApp for manual payment confirmation
      const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5512935854861";
      const text = encodeURIComponent(
        `Olá! Acabei de me cadastrar no FinControl.\n\nNome: ${nome}\nEmail: ${email}\nPlano Escolhido: ${plan.toUpperCase()}\n\nGostaria de confirmar meu pagamento para liberar o acesso total.`
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
      
      // Redirect to dashboard (user will be in trial mode)
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0a0c10]">
      {/* Visual side */}
      <div className="hidden md:flex md:w-5/12 bg-[#0d1117] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#3366ff10,transparent)]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-16">
             <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
               <Wallet size={24} />
             </div>
             <span className="text-xl font-black uppercase tracking-widest">FinControl</span>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-8">
              Comece sua jornada para a <span className="text-brand">liberdade</span> financeira.
            </h2>
            <div className="space-y-6">
               {[
                 { t: "Dashboard Premium", d: "Visualize cada centavo com clareza absoluta.", i: CheckCircle },
                 { t: "Controle Ilimitado", d: "Sem limites de transações em qualquer plano.", i: Zap },
                 { t: "Segurança Total", d: "Seus dados criptografados e sempre protegidos.", i: ShieldCheck },
               ].map((item, idx) => (
                 <div key={idx} className="flex gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                    <div className="w-10 h-10 rounded-2xl bg-brand/20 flex items-center justify-center text-brand"><item.i size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-white">{item.t}</p>
                      <p className="text-xs text-white/40">{item.d}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg py-12">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Criar sua conta</h2>
            <p className="text-sm font-medium opacity-60" style={{ color: "var(--text-secondary)" }}>Preencha os dados e escolha seu plano de potência</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold mb-6 animate-in slide-in-from-top-2 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Seu Nome Completo</label>
                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} 
                  className="input-field py-3" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Endereço de Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                  className="input-field py-3" placeholder="seu@email.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Criar Senha</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={senha} onChange={e => setSenha(e.target.value)} 
                      className="input-field py-3" placeholder="••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Repetir Senha</label>
                  <input type="password" required value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} 
                    className="input-field py-3" placeholder="••••••" />
               </div>
            </div>

            {/* Plan Selector */}
            <div className="space-y-4">
               <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Selecione seu Plano</label>
               <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "free", label: "Básico", price: "R$ 9", desc: "Essencial" },
                    { id: "pro", label: "Pro", price: "R$ 19", desc: "Completo" },
                    { id: "premium", label: "Premium", price: "R$ 39", desc: "Ilimitado" }
                  ].map(p => (
                    <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                      className={`p-4 rounded-3xl border-2 transition-all text-center relative overflow-hidden group ${plan === p.id ? 'border-brand bg-brand/5 shadow-xl shadow-brand/10' : 'border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/5'}`}>
                       <p className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${plan === p.id ? 'text-brand' : 'opacity-40'}`}>{p.label}</p>
                       <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{p.price},99</p>
                       <p className="text-[9px] font-bold opacity-30">/mês</p>
                       {plan === p.id && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand animate-ping" />}
                    </button>
                  ))}
               </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium py-2">
              Ao criar a conta, você concorda com nossos <Link href="#" className="text-brand hover:underline">Termos de Uso</Link> e <Link href="#" className="text-brand hover:underline">Política de Privacidade</Link>.
            </p>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 shadow-xl shadow-brand/20 active:scale-95 transition-all mt-4">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> Criar minha conta</>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Já faz parte? <Link href="/login" className="text-brand font-black hover:underline">Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
