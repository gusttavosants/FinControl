import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import {
  useDespesas,
  useCriarDespesa,
  useAtualizarDespesa,
  useDeletarDespesa,
  useTogglePagoDespesa,
} from "@hooks/useDespesas";
import {
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react-native";

const CATEGORIAS = [
  "Alimentacao",
  "Transporte",
  "Moradia",
  "Saude",
  "Educacao",
  "Lazer",
  "Vestuario",
  "Servicos",
  "Investimentos",
  "Outros",
];

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

export default function DespesasScreen() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const { data: despesas, isLoading, refetch } = useDespesas(mes, ano);
  const criarDespesa = useCriarDespesa();
  const atualizarDespesa = useAtualizarDespesa();
  const deletarDespesa = useDeletarDespesa();
  const togglePago = useTogglePagoDespesa();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    descricao: "",
    categoria: "Outros",
    valor: "",
    data_vencimento: new Date().toISOString().split("T")[0],
    parcela_atual: "",
    parcela_total: "",
  });

  const prevMonth = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const nextMonth = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

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

  const resetForm = () => {
    setForm({
      descricao: "",
      categoria: "Outros",
      valor: "",
      data_vencimento: new Date().toISOString().split("T")[0],
      parcela_atual: "",
      parcela_total: "",
    });
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      descricao: item.descricao,
      categoria: item.categoria,
      valor: String(item.valor),
      data_vencimento: item.data_vencimento,
      parcela_atual: item.parcela_atual ? String(item.parcela_atual) : "",
      parcela_total: item.parcela_total ? String(item.parcela_total) : "",
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.valor) {
      Alert.alert("Erro", "Preencha descricao e valor");
      return;
    }

    const payload = {
      descricao: form.descricao,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
      data_vencimento: form.data_vencimento,
      pago: false,
      parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null,
      parcela_total: form.parcela_total ? parseInt(form.parcela_total) : null,
    };

    try {
      if (editingId) {
        await atualizarDespesa.mutateAsync({ id: editingId, data: payload });
      } else {
        await criarDespesa.mutateAsync(payload);
      }
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err.response?.data?.detail || "Erro ao salvar despesa",
      );
    }
  };

  const handleDelete = (id: number, descricao: string) => {
    Alert.alert("Confirmar", `Deletar "${descricao}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: () => deletarDespesa.mutate(id),
      },
    ]);
  };

  const isSaving = criarDespesa.isPending || atualizarDespesa.isPending;

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#a3e635" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a3e635"
          />
        }
      >
        <View className="px-5 pt-14 pb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Despesas</Text>
            <TouchableOpacity
              className="bg-lime-500 px-4 py-2 rounded-lg flex-row items-center gap-2"
              onPress={openNew}
            >
              <Plus color="#000" size={18} />
              <Text className="text-black font-bold">Nova</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center bg-slate-800 rounded-xl p-3 mb-6 border border-slate-700">
            <TouchableOpacity onPress={prevMonth} className="p-2">
              <ChevronLeft color="#a3e635" size={22} />
            </TouchableOpacity>
            <Text className="text-white font-bold text-base">
              {MESES[mes - 1]} {ano}
            </Text>
            <TouchableOpacity onPress={nextMonth} className="p-2">
              <ChevronRight color="#a3e635" size={22} />
            </TouchableOpacity>
          </View>

          {!despesas || despesas.length === 0 ? (
            <View className="bg-slate-800 p-8 rounded-xl items-center">
              <Text className="text-slate-400 text-center">
                Nenhuma despesa encontrada
              </Text>
            </View>
          ) : (
            despesas.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3"
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">
                      {item.descricao}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-1">
                      {item.categoria}
                    </Text>
                  </View>
                  <Text className="text-red-400 font-bold text-base">
                    {formatCurrency(item.valor)}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center mt-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-slate-500 text-xs">
                      {item.data_vencimento}
                    </Text>
                    {item.parcela_atual && item.parcela_total && (
                      <Text className="text-slate-500 text-xs">
                        {item.parcela_atual}/{item.parcela_total}
                      </Text>
                    )}
                  </View>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="bg-slate-700 p-2 rounded-lg"
                      onPress={() => openEdit(item)}
                    >
                      <Pencil color="#94a3b8" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`p-2 rounded-lg ${item.pago ? "bg-lime-900" : "bg-slate-700"}`}
                      onPress={() => togglePago.mutate(item.id)}
                    >
                      <Check
                        color={item.pago ? "#a3e635" : "#64748b"}
                        size={16}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-900 p-2 rounded-lg"
                      onPress={() => handleDelete(item.id, item.descricao)}
                    >
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-900 rounded-t-3xl px-5 pt-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-lg font-bold">
                {editingId ? "Editar Despesa" : "Nova Despesa"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X color="#94a3b8" size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-3 border border-slate-700"
              placeholder="Descricao"
              placeholderTextColor="#94a3b8"
              value={form.descricao}
              onChangeText={(v) => setForm({ ...form, descricao: v })}
            />

            <TouchableOpacity
              className="bg-slate-800 p-4 rounded-lg mb-3 border border-slate-700 flex-row justify-between items-center"
              onPress={() => setCatModalVisible(true)}
            >
              <Text className="text-white">{form.categoria}</Text>
              <ChevronDown color="#94a3b8" size={18} />
            </TouchableOpacity>

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-3 border border-slate-700"
              placeholder="Valor"
              placeholderTextColor="#94a3b8"
              value={form.valor}
              onChangeText={(v) => setForm({ ...form, valor: v })}
              keyboardType="decimal-pad"
            />

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-3 border border-slate-700"
              placeholder="Data vencimento (AAAA-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={form.data_vencimento}
              onChangeText={(v) => setForm({ ...form, data_vencimento: v })}
            />

            <View className="flex-row gap-3 mb-4">
              <TextInput
                className="flex-1 bg-slate-800 text-white p-4 rounded-lg border border-slate-700"
                placeholder="Parcela atual"
                placeholderTextColor="#94a3b8"
                value={form.parcela_atual}
                onChangeText={(v) => setForm({ ...form, parcela_atual: v })}
                keyboardType="number-pad"
              />
              <TextInput
                className="flex-1 bg-slate-800 text-white p-4 rounded-lg border border-slate-700"
                placeholder="Total parcelas"
                placeholderTextColor="#94a3b8"
                value={form.parcela_total}
                onChangeText={(v) => setForm({ ...form, parcela_total: v })}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity
              className="bg-lime-500 p-4 rounded-lg"
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black font-bold text-center">
                  {editingId ? "Atualizar" : "Salvar"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={catModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          className="flex-1 bg-black/70 justify-center px-10"
          activeOpacity={1}
          onPress={() => setCatModalVisible(false)}
        >
          <View className="bg-slate-800 rounded-xl p-4">
            <Text className="text-white font-bold text-base mb-3">
              Categoria
            </Text>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`p-3 rounded-lg mb-1 ${form.categoria === cat ? "bg-lime-900" : ""}`}
                onPress={() => {
                  setForm({ ...form, categoria: cat });
                  setCatModalVisible(false);
                }}
              >
                <Text
                  className={`${form.categoria === cat ? "text-lime-400 font-bold" : "text-slate-300"}`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
