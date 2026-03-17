"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, LogIn, Eye, EyeOff, ShieldCheck, Sparkles, Loader2, Globe, Github, ChevronRight } from "lucide-react";
import Link from "next/link";
import { authAPI } from "@/lib/api";

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
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0a0c10] overflow-hidden">
      {/* Visual Section - Left */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-brand p-16 flex-col justify-between">
         {/* Dynamic Background */}
         <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/30 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
         </div>

         <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-20 scroll-reveal">
               <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                  <Wallet size={28} className="text-white" />
               </div>
               <span className="text-2xl font-black uppercase tracking-[0.2em]">FinControl</span>
            </div>

            <div className="max-w-xl">
               <h1 className="text-6xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
                  Domine suas finanças com <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">Inteligência.</span>
               </h1>
               <p className="text-xl text-white/60 font-medium leading-relaxed max-w-md">
                  A plataforma definitiva para quem busca liberdade financeira através de dados reais e tecnologia de ponta.
               </p>
            </div>
         </div>

         <div className="relative z-10 grid grid-cols-3 gap-8">
            <div className="space-y-2">
               <p className="text-3xl font-black text-white">99.9%</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Uptime Garantido</p>
            </div>
            <div className="space-y-2">
               <p className="text-3xl font-black text-white">256-bit</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Encryption</p>
            </div>
            <div className="space-y-2">
               <p className="text-3xl font-black text-white">15k+</p>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Users</p>
            </div>
         </div>
      </div>

      {/* Form Section - Right */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 relative">
         <div className="w-full max-w-[400px] animate-fade-in">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-12">
               <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white"><Wallet size={20} /></div>
                  <span className="text-xl font-black text-brand tracking-widest uppercase">FinControl</span>
               </div>
            </div>

            <div className="mb-12 text-center lg:text-left">
               <h2 className="text-4xl font-black mb-3 tracking-tight" style={{ color: "var(--text-primary)" }}>Bem-vindo de volta!</h2>
               <p className="text-sm font-bold opacity-40" style={{ color: "var(--text-secondary)" }}>Acesse sua conta para gerenciar seu patrimônio.</p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black mb-8 flex items-center gap-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">E-mail Corporativo</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field !py-4 !px-5 !rounded-2xl shadow-sm border-slate-200 dark:border-slate-800" placeholder="seu@email.com" />
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Senha de Acesso</label>
                     <Link href="#" className="text-[10px] font-black text-brand hover:underline">Esqueceu a senha?</Link>
                  </div>
                  <div className="relative">
                     <input type={showPassword ? "text" : "password"} required value={senha} onChange={e => setSenha(e.target.value)}
                       className="input-field !py-4 !px-5 !rounded-2xl pr-14 shadow-sm border-slate-200 dark:border-slate-800" placeholder="••••••••" />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand transition-colors">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                     </button>
                  </div>
               </div>

               <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                  <label htmlFor="remember" className="text-xs font-bold opacity-60 cursor-pointer">Manter conectado por 30 dias</label>
               </div>

               <button type="submit" disabled={loading} className="btn-primary w-full !py-4 !rounded-2xl shadow-xl shadow-brand/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99]">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <><LogIn size={20} /> Entrar no Command Center</>}
               </button>
            </form>

            <div className="mt-12">
               <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                  <span className="relative px-4 bg-white dark:bg-[#0a0c10] text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Ou use uma conta</span>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button className="btn-secondary !py-3 !rounded-2xl flex items-center justify-center gap-2 text-xs font-black">
                     <Globe size={16} /> Google
                  </button>
                  <button className="btn-secondary !py-3 !rounded-2xl flex items-center justify-center gap-2 text-xs font-black">
                     <Github size={16} /> GitHub
                  </button>
               </div>
            </div>

            <p className="mt-12 text-center text-sm font-bold opacity-60">
               Novo por aqui? <Link href="/register" className="text-brand font-black hover:underline inline-flex items-center gap-1">Criar conta gratuita <ChevronRight size={14} /></Link>
            </p>
         </div>

         {/* Footer legal */}
         <div className="absolute bottom-8 text-[10px] font-bold opacity-20 uppercase tracking-widest text-center w-full px-8">
            © 2026 FinControl Technologies Inc. • Built with Privacy in Mind
         </div>
      </div>
    </div>
  );
}

function AlertCircle({ size }: { size: number }) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
   );
}
