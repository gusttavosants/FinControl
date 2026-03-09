"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: {
    max_transactions: number;
    max_goals: number;
    max_investments: number;
    export_enabled: boolean;
    ai_chat_enabled: boolean;
    shared_account_enabled: boolean;
  };
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plans/available`);
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/plans/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCurrentPlan(data.current_plan);
    } catch (error) {
      console.error("Error fetching current plan:", error);
    }
  };

  const handleCheckout = async (
    planId: string,
    paymentMethod: "stripe" | "mercadopago",
  ) => {
    if (planId === "free") return;

    setCheckoutLoading(planId);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/payment/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
          payment_method: paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (paymentMethod === "stripe") {
          window.location.href = data.checkout_url;
        } else {
          window.location.href = data.init_point;
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatFeatureValue = (value: number | boolean) => {
    if (typeof value === "boolean") return value;
    if (value === -1) return "Ilimitado";
    return value.toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para você
          </h1>
          <p className="text-xl text-gray-600">
            Controle suas finanças com as ferramentas certas
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isPro = plan.id === "pro";
            const isPremium = plan.id === "premium";

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all hover:scale-105 ${
                  isPremium ? "ring-4 ring-indigo-600" : ""
                }`}
              >
                {isPremium && (
                  <div className="bg-indigo-600 text-white text-center py-2 font-semibold">
                    🌟 Mais Popular
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">
                      R$ {plan.price.toFixed(2)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">/mês</span>
                    )}
                  </div>

                  {isCurrentPlan && (
                    <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-center font-semibold">
                      ✓ Plano Atual
                    </div>
                  )}

                  <div className="space-y-4 mb-8">
                    <FeatureItem
                      label="Transações"
                      value={formatFeatureValue(plan.features.max_transactions)}
                      enabled={true}
                    />
                    <FeatureItem
                      label="Metas"
                      value={formatFeatureValue(plan.features.max_goals)}
                      enabled={true}
                    />
                    <FeatureItem
                      label="Investimentos"
                      value={formatFeatureValue(plan.features.max_investments)}
                      enabled={true}
                    />
                    <FeatureItem
                      label="Exportar relatórios"
                      enabled={plan.features.export_enabled}
                    />
                    <FeatureItem
                      label="Chat AI"
                      enabled={plan.features.ai_chat_enabled}
                    />
                    <FeatureItem
                      label="Conta compartilhada"
                      enabled={plan.features.shared_account_enabled}
                    />
                  </div>

                  {plan.id !== "free" && !isCurrentPlan && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleCheckout(plan.id, "stripe")}
                        disabled={checkoutLoading === plan.id}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {checkoutLoading === plan.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Assinar com Cartão"
                        )}
                      </button>

                      <button
                        onClick={() => handleCheckout(plan.id, "mercadopago")}
                        disabled={checkoutLoading === plan.id}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {checkoutLoading === plan.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Pagar com Mercado Pago"
                        )}
                      </button>
                    </div>
                  )}

                  {plan.id === "free" && !isCurrentPlan && (
                    <button
                      onClick={() => router.push("/register")}
                      className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Começar Grátis
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">💳 Pagamento seguro com Stripe e Mercado Pago</p>
          <p className="mb-2">🔒 Cancele a qualquer momento</p>
          <p>📧 Suporte por email: suporte@fincontrol.com</p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  label,
  value,
  enabled,
}: {
  label: string;
  value?: string | number | boolean;
  enabled: boolean;
}) {
  const displayValue = typeof value === "boolean" ? null : value;

  return (
    <div className="flex items-center gap-3">
      {enabled ? (
        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
      ) : (
        <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}
      <span className={enabled ? "text-gray-900" : "text-gray-400"}>
        {label}
        {displayValue && `: ${displayValue}`}
      </span>
    </div>
  );
}
