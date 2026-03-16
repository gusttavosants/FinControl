"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Subscription {
  plan: string;
  status: string;
  has_subscription: boolean;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  description: string;
  created_at: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchPayments();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/payment/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/api/payment/payments/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura?")) return;

    setCancelLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/payment/subscription/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: "User requested" }),
        },
      );

      const data = await response.json();
      if (data.success) {
        alert(
          "Assinatura cancelada. Você terá acesso até o fim do período pago.",
        );
        fetchSubscription();
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Minha Assinatura
      </h1>

      {/* Subscription Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Plano{" "}
                {subscription?.plan
                  ? subscription.plan.charAt(0).toUpperCase() +
                    subscription.plan.slice(1)
                  : "N/A"}
              </h2>
              <p className="text-gray-600">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    subscription?.status === "active"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {subscription?.status === "active"
                    ? "Ativo"
                    : subscription?.status}
                </span>
              </p>
            </div>
          </div>

          {subscription?.plan !== "free" && (
            <button
              onClick={() => router.push("/pricing")}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Fazer Upgrade
            </button>
          )}
        </div>

        {subscription?.has_subscription && (
          <div className="space-y-4">
            {subscription.current_period_start &&
              subscription.current_period_end && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span>
                    Período atual:{" "}
                    {new Date(
                      subscription.current_period_start,
                    ).toLocaleDateString("pt-BR")}
                    {" - "}
                    {new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}

            {subscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Cancelamento Agendado
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Sua assinatura será cancelada em{" "}
                    {new Date(
                      subscription.current_period_end!,
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            {!subscription.cancel_at_period_end &&
              subscription.plan !== "free" && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                >
                  {cancelLoading ? "Cancelando..." : "Cancelar Assinatura"}
                </button>
              )}
          </div>
        )}

        {!subscription?.has_subscription && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Você está no plano gratuito</p>
            <button
              onClick={() => router.push("/pricing")}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Ver Planos Pagos
            </button>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Histórico de Pagamentos
        </h2>

        {payments.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Nenhum pagamento registrado
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {payment.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.created_at).toLocaleDateString("pt-BR")} -{" "}
                    {payment.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </p>
                  <span
                    className={`text-sm font-semibold ${
                      payment.status === "succeeded"
                        ? "text-green-600"
                        : payment.status === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {payment.status === "succeeded"
                      ? "Pago"
                      : payment.status === "failed"
                        ? "Falhou"
                        : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
