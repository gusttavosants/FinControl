"use client";

import { useState, useEffect } from "react";
import { 
  Users, DollarSign, TrendingUp, Activity, 
  BarChart3, PieChart, Loader2 
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BusinessMetrics {
  users: {
    total: number;
    new_this_month: number;
    active_paid: number;
    free_users: number;
  };
  subscriptions: {
    total_paid: number;
    pro: number;
    premium: number;
    conversion_rate: number;
  };
  revenue: {
    mrr: number;
    total_lifetime: number;
    this_month: number;
  };
  metrics: {
    churn_rate: number;
    arpu: number;
  };
}

interface EngagementMetrics {
  active_users_30d: number;
  engagement_rate: number;
  avg_transactions_per_user: number;
  users_with_goals: number;
  users_with_investments: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMetrics();
  }, []);

  const fetchAllMetrics = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Não autorizado");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, engagementRes, chartRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/metrics`, { headers }),
        fetch(`${API_URL}/api/admin/engagement`, { headers }),
        fetch(`${API_URL}/api/admin/revenue-chart?months=6`, { headers }),
      ]);

      if (!metricsRes.ok) {
        throw new Error("Acesso negado - apenas administradores");
      }

      setMetrics(await metricsRes.json());
      setEngagement(await engagementRes.json());
      setRevenueChart(await chartRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Dashboard Administrativo
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="MRR"
          value={`R$ ${metrics?.revenue.mrr.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Usuários Totais"
          value={metrics?.users.total || 0}
          subtitle={`${metrics?.users.new_this_month} novos este mês`}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Assinaturas Pagas"
          value={metrics?.subscriptions.total_paid || 0}
          subtitle={`${metrics?.subscriptions.conversion_rate}% conversão`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="ARPU"
          value={`R$ ${metrics?.metrics.arpu.toFixed(2)}`}
          subtitle={`Churn: ${metrics?.metrics.churn_rate.toFixed(1)}%`}
          icon={<Activity className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Receita Mensal
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Receita (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscriptions Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Novas Assinaturas
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="new_subscriptions" 
                stroke="#8b5cf6" 
                name="Novas Assinaturas"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Distribuição de Usuários
          </h2>
          <div className="space-y-3">
            <MetricRow label="Usuários Free" value={metrics?.users.free_users || 0} />
            <MetricRow label="Plano Pro" value={metrics?.subscriptions.pro || 0} />
            <MetricRow label="Plano Premium" value={metrics?.subscriptions.premium || 0} />
            <MetricRow 
              label="Taxa de Conversão" 
              value={`${metrics?.subscriptions.conversion_rate.toFixed(2)}%`} 
            />
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Engajamento
          </h2>
          <div className="space-y-3">
            <MetricRow 
              label="Usuários Ativos (30d)" 
              value={engagement?.active_users_30d || 0} 
            />
            <MetricRow 
              label="Taxa de Engajamento" 
              value={`${engagement?.engagement_rate.toFixed(1)}%`} 
            />
            <MetricRow 
              label="Média Transações/Usuário" 
              value={engagement?.avg_transactions_per_user.toFixed(1) || 0} 
            />
            <MetricRow 
              label="Usuários com Metas" 
              value={engagement?.users_with_goals || 0} 
            />
            <MetricRow 
              label="Usuários com Investimentos" 
              value={engagement?.users_with_investments || 0} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ReactNode; 
  color: string;
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
