"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Eye, EyeOff, Loader2, ShieldCheck, Leaf, Layout, Users, X, ArrowRight, Lock, Star, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { authAPI, paymentAPI } from "@/lib/api";
import PublicNav from "@/components/PublicNav";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState("trial"); // Default

  useEffect(() => {
    const p = searchParams.get("plan");
    if (p && ["trial", "basico", "pro", "premium"].includes(p)) {
      setPlan(p);
    }
  }, [searchParams]);

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
      
      if (plan === "trial") {
        sessionStorage.setItem("welcomeMessage", "Bem-vindo ao ZenCash! Sua jornada de 7 dias começa agora.");
        sessionStorage.setItem("showTour", "true");
        router.push("/");
        return;
      }

      try {
        const checkoutData = await paymentAPI.checkout(plan, "stripe");
        if (checkoutData.checkout_url) {
          window.location.href = checkoutData.checkout_url;
        } else {
          router.push("/");
        }
      } catch (payErr: any) {
        console.error("Erro ao iniciar checkout:", payErr);
        sessionStorage.setItem("welcomeMessage", "Conta criada! No entanto, houve um erro ao iniciar o pagamento. Tente novamente no painel.");
        router.push("/");
      }
    } catch (err: any) {
      const detail = err.message || "Erro ao criar conta";
      setError(detail);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand)] selection:text-[var(--brand-text)] font-sans antialiased overflow-x-hidden">
      <PublicNav />

      <main className="relative pt-32 lg:pt-0 min-h-screen flex items-center justify-center px-6">
        {/* Dynamic Atmosphere */}
        <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden">
           <div className="absolute -top-[10%] left-[10%] w-[60%] h-[60%] bg-[var(--brand-muted)] rounded-full blur-[120px] opacity-40 animate-pulse" />
           <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-[var(--accent-muted)] rounded-full blur-[100px] opacity-30 animate-pulse delay-700" />
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10 py-20">
           
           {/* Left: Zen Content */}
           <div className="hidden lg:block space-y-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                 <Sparkles size={14} className="text-[var(--brand)]" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Início da Jornada</span>
              </div>
              <h1 className="text-7xl xl:text-8xl font-black tracking-tighter leading-none">
                 O primeiro <br /><span className="opacity-30 italic">passo</span> para o <br />controle absoluto.
              </h1>
              <p className="text-2xl text-[var(--text-secondary)] font-medium leading-relaxed max-w-md">
                 Abra seu santuário em menos de 1 minuto e sinta a leveza de governar sua riqueza.
              </p>

              <div className="space-y-6 pt-10">
                 {[
                    { t: "Clareza Absoluta", d: "Visualize cada movimento com design de elite.", i: Layout },
                    { t: "Poder Compartilhado", d: "Sincronia perfeita para casais modernos.", i: Users },
                    { t: "Segurança Zen", d: "Seus dados protegidos no santuário digital.", i: ShieldCheck },
                 ].map((item, idx) => (
                    <div key={idx} className="flex gap-6 items-center group">
                       <div className="w-14 h-14 rounded-2xl bg-white/40 border border-white/20 flex items-center justify-center text-[var(--brand)] shadow-lg group-hover:scale-110 transition-transform">
                          <item.i size={24} />
                       </div>
                       <div>
                          <p className="text-lg font-black">{item.t}</p>
                          <p className="text-sm font-medium opacity-50">{item.d}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Right: Register Card */}
           <div className="w-full max-w-[640px] mx-auto">
              <div className="bg-white/40 dark:bg-black/20 p-2 rounded-[54px] border border-white/20 dark:border-white/5 backdrop-blur-3xl shadow-2xl">
                 <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-8 md:p-14 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="mb-12 text-center lg:text-left">
                       <h2 className="text-4xl font-black mb-3 tracking-tighter">Criar Conta</h2>
                       <p className="text-base font-medium opacity-50">Escolha seu nível de controle financeiro.</p>
                    </div>

                    {error && (
                      <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold mb-10 flex items-center gap-4 animate-in slide-in-from-top-2">
                        <div className="w-8 h-8 rounded-full bg-rose-600/10 flex items-center justify-center shrink-0">
                           <X size={14} className="text-rose-600" />
                        </div>
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                             <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Nome</label>
                             <input 
                                type="text" 
                                required 
                                value={nome} 
                                onChange={e => setNome(e.target.value)}
                                className="w-full px-6 py-4 rounded-[22px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-base font-medium placeholder:opacity-40" 
                                placeholder="Seu Nome" 
                             />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">E-mail</label>
                             <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-6 py-4 rounded-[22px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-base font-medium placeholder:opacity-40" 
                                placeholder="seu@exemplo.com" 
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                             <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Senha</label>
                             <div className="relative">
                                <input 
                                   type={showPassword ? "text" : "password"} 
                                   required 
                                   value={senha} 
                                   onChange={e => setSenha(e.target.value)}
                                   className="w-full px-6 py-4 rounded-[22px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] pr-14 focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-base font-medium placeholder:opacity-40" 
                                   placeholder="••••••••" 
                                />
                                <button 
                                   type="button" 
                                   onClick={() => setShowPassword(!showPassword)} 
                                   className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                                >
                                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Confirmação</label>
                             <input 
                                type="password" 
                                required 
                                value={confirmSenha} 
                                onChange={e => setConfirmSenha(e.target.value)}
                                className="w-full px-6 py-4 rounded-[22px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-base font-medium placeholder:opacity-40" 
                                placeholder="••••••••" 
                             />
                          </div>
                       </div>

                       {/* Selection of Plan */}
                       <div className="space-y-5">
                          <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Plano Desejado</label>
                          <div className="grid grid-cols-3 gap-3">
                             {[
                                { id: "trial", label: "Trial 7d", icon: Leaf },
                                { id: "basico", label: "Básico", icon: Star },
                                { id: "pro", label: "Pro", icon: Target },
                                { id: "premium", label: "Elite", icon: Sparkles }
                             ].map((p) => {
                                const Icon = p.icon;
                                const isSelected = plan === p.id;
                                return (
                                   <button 
                                      key={p.id} 
                                      type="button" 
                                      onClick={() => setPlan(p.id)}
                                      className={`p-4 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${isSelected ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-xl shadow-[var(--brand)]/10' : 'border-[var(--border-subtle)] bg-white/40 dark:bg-black/20 hover:border-[var(--brand)]/30'}`}
                                   >
                                      <Icon size={18} className={isSelected ? 'text-[var(--brand)]' : 'opacity-30'} />
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-[var(--brand)]' : 'opacity-40'}`}>{p.label}</span>
                                      {isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />}
                                   </button>
                                );
                             })}
                          </div>
                       </div>

                       <button 
                          type="submit" 
                          disabled={loading} 
                          className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl ${loading ? 'bg-[var(--border-subtle)] opacity-50 cursor-not-allowed' : 'bg-[var(--brand)] text-[var(--brand)] [color-scheme:dark] bg-[var(--brand)] !text-[var(--brand-text)] shadow-[var(--brand)]/30 hover:scale-[1.02]'}`}
                       >
                          {loading ? <Loader2 size={24} className="animate-spin" /> : <><UserPlus size={24} /> Criar Santuário</>}
                       </button>
                    </form>

                    <div className="mt-12 text-center">
                       <p className="text-sm font-bold opacity-60">
                          Já possui uma conta? <Link href="/login" className="text-[var(--brand)] font-black hover:underline inline-flex items-center gap-1">Acessar Painel <ArrowRight size={14} /></Link>
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Legal Footer */}
      <footer className="py-10 text-center relative z-10">
         <div className="text-[10px] font-black opacity-20 uppercase tracking-[0.4em]">
            © 2026 ZEN CASH TECHNOLOGIES • BUILT WITH SERENITY
         </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden" style={{ background: "var(--bg-base)" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[var(--brand-muted)] rounded-full blur-[140px] opacity-20 animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[var(--accent-muted)] rounded-full blur-[120px] opacity-10 animate-pulse delay-1000" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-20 h-20 rounded-[28px] bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-3xl flex items-center justify-center shadow-2xl">
              <Leaf size={38} className="text-[var(--brand)] animate-bounce" />
            </div>
            <div className="mt-8 space-y-4 flex flex-col items-center">
              <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <div className="absolute inset-y-0 left-0 bg-[var(--brand)] w-full -translate-x-full animate-loading" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand)] opacity-40">ZenCash</p>
            </div>
        </div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
