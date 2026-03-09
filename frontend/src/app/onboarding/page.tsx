"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Wallet, Target, TrendingUp, CheckCircle, 
  ArrowRight, Sparkles 
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    monthly_income: "",
    main_goal: "",
    budget_categories: [] as string[],
  });

  const steps = [
    {
      number: 1,
      title: "Bem-vindo ao FinControl! 🎉",
      description: "Vamos configurar sua conta em 3 passos simples",
      icon: <Sparkles className="w-12 h-12 text-indigo-600" />,
    },
    {
      number: 2,
      title: "Qual sua renda mensal?",
      description: "Isso nos ajuda a criar recomendações personalizadas",
      icon: <Wallet className="w-12 h-12 text-green-600" />,
    },
    {
      number: 3,
      title: "Qual seu principal objetivo?",
      description: "Vamos te ajudar a alcançá-lo",
      icon: <Target className="w-12 h-12 text-blue-600" />,
    },
    {
      number: 4,
      title: "Tudo pronto! 🚀",
      description: "Sua conta está configurada",
      icon: <CheckCircle className="w-12 h-12 text-green-600" />,
    },
  ];

  const goals = [
    { id: "save", label: "Economizar dinheiro", emoji: "💰" },
    { id: "invest", label: "Começar a investir", emoji: "📈" },
    { id: "debt", label: "Pagar dívidas", emoji: "💳" },
    { id: "control", label: "Controlar gastos", emoji: "📊" },
  ];

  const categories = [
    "Alimentação", "Transporte", "Moradia", "Lazer", 
    "Saúde", "Educação", "Outros"
  ];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    router.push("/");
  };

  const completeOnboarding = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Save onboarding data
      await fetch(`${API_URL}/api/user/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      // Mark onboarding as complete
      localStorage.setItem("onboarding_complete", "true");
      
      router.push("/");
    } catch (error) {
      console.error("Onboarding error:", error);
      router.push("/");
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      budget_categories: prev.budget_categories.includes(category)
        ? prev.budget_categories.filter(c => c !== category)
        : [...prev.budget_categories, category]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s) => (
              <div
                key={s.number}
                className={`flex-1 h-2 rounded-full mx-1 transition-all ${
                  s.number <= step ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-gray-600 text-sm">
            Passo {step} de {steps.length}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {steps[step - 1].icon}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {steps[step - 1].title}
            </h1>
            <p className="text-gray-600">{steps[step - 1].description}</p>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <FeatureBox icon="📊" label="Dashboard Intuitivo" />
                <FeatureBox icon="🎯" label="Metas Personalizadas" />
                <FeatureBox icon="📈" label="Controle de Investimentos" />
              </div>
              <p className="text-center text-gray-600">
                Comece a controlar suas finanças de forma simples e eficiente
              </p>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
                  R$
                </span>
                <input
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Você pode pular esta etapa e adicionar depois
              </p>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setFormData({ ...formData, main_goal: goal.id })}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    formData.main_goal === goal.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="text-4xl mb-2">{goal.emoji}</div>
                  <p className="font-semibold text-gray-900">{goal.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Conta configurada com sucesso!
                </h2>
                <p className="text-gray-600">
                  Agora você pode começar a usar todas as funcionalidades do FinControl
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-900 font-semibold"
            >
              Pular
            </button>

            <button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {step === 4 ? "Ir para Dashboard" : "Continuar"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-xl">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
    </div>
  );
}
