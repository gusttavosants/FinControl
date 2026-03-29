"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, LogIn, Eye, EyeOff, ShieldCheck, Sparkles, Loader2, ChevronRight, Star, Heart, Lock } from "lucide-react";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import PublicNav from "@/components/PublicNav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authAPI.login(email, senha);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.message) sessionStorage.setItem("welcomeMessage", data.message);
        if (data.show_tour) sessionStorage.setItem("showTour", "true");
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand)] selection:text-[var(--brand-text)] font-sans antialiased overflow-hidden">
      <PublicNav />

      <main className="relative pt-32 lg:pt-0 min-h-screen flex items-center justify-center px-6">
        {/* Dynamic Atmosphere */}
        <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden">
           <div className="absolute -top-[10%] left-[10%] w-[60%] h-[60%] bg-[var(--brand-muted)] rounded-full blur-[120px] opacity-40 animate-pulse" />
           <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-[var(--accent-muted)] rounded-full blur-[100px] opacity-30 animate-pulse delay-700" />
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
           
           {/* Left: Zen Content */}
           <div className="hidden lg:block space-y-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                 <Lock size={14} className="text-[var(--brand)]" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Acesso Seguro</span>
              </div>
              <h1 className="text-7xl font-black tracking-tighter leading-none">
                 Sua paz <br /><span className="opacity-30 italic">começa</span> aqui.
              </h1>
              <p className="text-2xl text-[var(--text-secondary)] font-medium leading-relaxed max-w-md">
                 Entre no seu santuário financeiro e cultive sua liberdade com clareza e elegância.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-10">
                 <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/20 flex items-center justify-center text-[var(--brand)] shadow-lg">
                       <ShieldCheck size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Privacidade Total</p>
                    <p className="text-sm font-bold opacity-70">Dados criptografados com padrões bancários.</p>
                 </div>
                 <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/20 flex items-center justify-center text-[var(--brand)] shadow-lg">
                       <Star size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Experiência Elite</p>
                    <p className="text-sm font-bold opacity-70">Onde o controle encontra a serenidade.</p>
                 </div>
              </div>
           </div>

           {/* Right: Login Card */}
           <div className="w-full max-w-[500px] mx-auto">
              <div className="bg-white/40 dark:bg-black/20 p-2 rounded-[54px] border border-white/20 dark:border-white/5 backdrop-blur-3xl shadow-2xl">
                 <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-10 md:p-14 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="mb-12 text-center lg:text-left">
                       <h2 className="text-4xl font-black mb-3 tracking-tighter">Entrar</h2>
                       <p className="text-base font-medium opacity-50">Bem-vindo(a) de volta ao ZenCash.</p>
                    </div>

                    {error && (
                      <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold mb-10 flex items-center gap-4 animate-in slide-in-from-top-2">
                        <div className="w-8 h-8 rounded-full bg-rose-600/10 flex items-center justify-center shrink-0">
                           <Lock size={14} className="text-rose-600" />
                        </div>
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                       <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">E-mail</label>
                          <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-6 py-5 rounded-[24px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-lg font-medium placeholder:opacity-40" 
                            placeholder="seu@exemplo.com" 
                          />
                       </div>

                       <div className="space-y-3">
                          <div className="flex justify-between items-center px-2">
                             <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40">Senha</label>
                             <Link href="#" className="text-[10px] font-black text-[var(--brand)] hover:opacity-100 opacity-60 transition-opacity uppercase tracking-widest">Esqueceu?</Link>
                          </div>
                          <div className="relative">
                             <input 
                                type={showPassword ? "text" : "password"} 
                                required 
                                value={senha} 
                                onChange={e => setSenha(e.target.value)}
                                className="w-full px-6 py-5 rounded-[24px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] pr-16 focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none text-lg font-medium placeholder:opacity-40" 
                                placeholder="••••••••" 
                             />
                             <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                             >
                                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                             </button>
                          </div>
                       </div>

                       <button 
                          type="submit" 
                          disabled={loading} 
                          className={`w-full py-6 rounded-[28px] font-black uppercase tracking-widest text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl ${loading ? 'bg-[var(--border-subtle)] opacity-50 cursor-not-allowed' : 'bg-[var(--brand)] text-[var(--brand-text)] shadow-[var(--brand)]/30 hover:scale-[1.02]'}`}
                       >
                          {loading ? <Loader2 size={24} className="animate-spin" /> : <><LogIn size={24} /> Entrar</>}
                       </button>
                    </form>

                    <div className="mt-12 space-y-6">
                       <button 
                         type="button" 
                         onClick={async () => {
                           setLoading(true);
                           try {
                             await authAPI.demo();
                             router.push("/");
                           } catch (err) {
                             setError("Erro ao acessar modo demonstração.");
                           } finally { setLoading(false); }
                         }} 
                         className="w-full py-4 rounded-[24px] border-2 border-[var(--brand)]/20 text-[var(--brand)] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[var(--brand)]/5 transition-all"
                       >
                          <Sparkles size={18} /> Acesso Rápido (Trial)
                       </button>

                       <p className="text-center text-sm font-bold opacity-60">
                          Primeira vez? <Link href="/register" className="text-[var(--brand)] font-black hover:underline inline-flex items-center gap-1">Criar Conta Zen <ChevronRight size={14} /></Link>
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
