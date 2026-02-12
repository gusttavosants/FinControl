import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import {
  useDashboardResumo,
  useDashboardCategorias,
  useDashboardVencimentos,
  useDashboardEvolucao,
} from "@hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react-native";
import { BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 40;

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data: resumo, isLoading, refetch } = useDashboardResumo(mes, ano);
  const { data: categorias } = useDashboardCategorias(mes, ano);
  const { data: vencimentos } = useDashboardVencimentos(7);
  const { data: evolucao } = useDashboardEvolucao(6);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value || 0)
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#a3e635" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a3e635"
        />
      }
    >
      <View className="px-5 pt-14 pb-4">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm">Bem-vindo,</Text>
            <Text className="text-white text-xl font-bold">{user?.nome}</Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="bg-slate-800 p-3 rounded-full"
          >
            <LogOut color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center bg-slate-800 rounded-xl p-3 mb-6 border border-slate-700">
          <TouchableOpacity
            onPress={() => {
              if (mes === 1) {
                setMes(12);
                setAno(ano - 1);
              } else {
                setMes(mes - 1);
              }
            }}
            className="p-2"
          >
            <ChevronLeft color="#a3e635" size={22} />
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">
            {MESES[mes - 1]} {ano}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (mes === 12) {
                setMes(1);
                setAno(ano + 1);
              } else {
                setMes(mes + 1);
              }
            }}
            className="p-2"
          >
            <ChevronRight color="#a3e635" size={22} />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <View className="flex-row items-center gap-2 mb-2">
              <TrendingUp color="#a3e635" size={18} />
              <Text className="text-slate-400 text-xs">Receitas</Text>
            </View>
            <Text className="text-lime-400 text-lg font-bold">
              {formatCurrency(resumo?.total_receitas)}
            </Text>
          </View>

          <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <View className="flex-row items-center gap-2 mb-2">
              <TrendingDown color="#ef4444" size={18} />
              <Text className="text-slate-400 text-xs">Despesas</Text>
            </View>
            <Text className="text-red-400 text-lg font-bold">
              {formatCurrency(resumo?.total_despesas)}
            </Text>
          </View>
        </View>

        <View className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
          <View className="flex-row items-center gap-2 mb-2">
            <Wallet color="#a3e635" size={18} />
            <Text className="text-slate-400 text-sm">Saldo do Mes</Text>
          </View>
          <Text
            className={`text-2xl font-bold ${(resumo?.saldo || 0) >= 0 ? "text-lime-400" : "text-red-400"}`}
          >
            {formatCurrency(resumo?.saldo)}
          </Text>
        </View>

        {evolucao && evolucao.length > 0 && (
          <View className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <BarChart3 color="#a3e635" size={18} />
              <Text className="text-white font-bold text-base">
                Evolucao Mensal
              </Text>
            </View>
            <BarChart
              data={{
                labels: evolucao.map((e: any) => e.mes || ""),
                datasets: [
                  {
                    data: evolucao.map((e: any) => e.receitas || 0),
                    color: () => "#a3e635",
                  },
                  {
                    data: evolucao.map((e: any) => e.despesas || 0),
                    color: () => "#ef4444",
                  },
                ],
              }}
              width={screenWidth}
              height={200}
              yAxisLabel="R$"
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars={false}
              chartConfig={{
                backgroundColor: "#1a1d2e",
                backgroundGradientFrom: "#1e293b",
                backgroundGradientTo: "#1e293b",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(163, 230, 53, ${opacity})`,
                labelColor: () => "#94a3b8",
                barPercentage: 0.5,
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: "#334155",
                },
              }}
              style={{ borderRadius: 12 }}
            />
            <View className="flex-row justify-center gap-6 mt-3">
              <View className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded-sm bg-lime-400" />
                <Text className="text-slate-400 text-xs">Receitas</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded-sm bg-red-400" />
                <Text className="text-slate-400 text-xs">Despesas</Text>
              </View>
            </View>
          </View>
        )}

        {categorias &&
          categorias.length > 0 &&
          (() => {
            const maxTotal = Math.max(
              ...categorias.map((c: any) => c.total || 0),
              1,
            );
            const COLORS = [
              "#a3e635",
              "#f59e0b",
              "#ef4444",
              "#3b82f6",
              "#8b5cf6",
              "#ec4899",
              "#14b8a6",
              "#f97316",
              "#06b6d4",
              "#6366f1",
            ];
            return (
              <View className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                <Text className="text-white font-bold text-base mb-4">
                  Gastos por Categoria
                </Text>
                {categorias.map((cat: any, index: number) => {
                  const pct = ((cat.total || 0) / maxTotal) * 100;
                  return (
                    <View key={index} className="mb-3">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-300 text-sm flex-1">
                          {cat.categoria}
                        </Text>
                        <Text className="text-slate-400 text-sm">
                          {formatCurrency(cat.total)}
                        </Text>
                      </View>
                      <View className="bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

        {vencimentos && vencimentos.length > 0 && (
          <View className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <AlertTriangle color="#f59e0b" size={18} />
              <Text className="text-white font-bold text-base">
                Proximos Vencimentos
              </Text>
            </View>
            {vencimentos.map((item: any, index: number) => (
              <View
                key={index}
                className="flex-row justify-between items-center mb-3 pb-3 border-b border-slate-700"
              >
                <View className="flex-1">
                  <Text className="text-slate-300 text-sm">
                    {item.descricao}
                  </Text>
                  <Text className="text-slate-500 text-xs">
                    {item.data_vencimento}
                  </Text>
                </View>
                <Text className="text-red-400 font-bold">
                  {formatCurrency(item.valor)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
