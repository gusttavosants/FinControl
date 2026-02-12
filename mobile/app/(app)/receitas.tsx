import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receitasAPI } from '@/lib/api';
import { Plus, Trash2, X, ChevronDown } from 'lucide-react-native';

const CATEGORIAS = [
  'Salario', 'Freelance', 'Investimentos', 'Vendas', 'Presente', 'Outros',
];

export default function ReceitasScreen() {
  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());
  const queryClient = useQueryClient();

  const { data: receitas, isLoading, refetch } = useQuery({
    queryKey: ['receitas', mes, ano],
    queryFn: () => receitasAPI.listar(mes, ano),
    select: (response) => response.data,
  });

  const criarReceita = useMutation({
    mutationFn: (data: any) => receitasAPI.criar(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receitas'] }),
  });

  const deletarReceita = useMutation({
    mutationFn: (id: number) => receitasAPI.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receitas'] }),
  });

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);

  const [form, setForm] = useState({
    descricao: '',
    categoria: 'Salario',
    valor: '',
    data: new Date().toISOString().split('T')[0],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const resetForm = () => {
    setForm({
      descricao: '',
      categoria: 'Salario',
      valor: '',
      data: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.valor) {
      Alert.alert('Erro', 'Preencha descricao e valor');
      return;
    }

    try {
      await criarReceita.mutateAsync({
        descricao: form.descricao,
        categoria: form.categoria,
        valor: parseFloat(form.valor),
        data: form.data,
      });
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.detail || 'Erro ao criar receita');
    }
  };

  const handleDelete = (id: number, descricao: string) => {
    Alert.alert('Confirmar', `Deletar "${descricao}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: () => deletarReceita.mutate(id),
      },
    ]);
  };

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a3e635" />}
      >
        <View className="px-5 pt-14 pb-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold">Receitas</Text>
            <TouchableOpacity
              className="bg-lime-500 px-4 py-2 rounded-lg flex-row items-center gap-2"
              onPress={() => setModalVisible(true)}
            >
              <Plus color="#000" size={18} />
              <Text className="text-black font-bold">Nova</Text>
            </TouchableOpacity>
          </View>

          {(!receitas || receitas.length === 0) ? (
            <View className="bg-slate-800 p-8 rounded-xl items-center">
              <Text className="text-slate-400 text-center">Nenhuma receita encontrada</Text>
            </View>
          ) : (
            receitas.map((item: any) => (
              <View key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">{item.descricao}</Text>
                    <Text className="text-slate-400 text-xs mt-1">{item.categoria}</Text>
                    <Text className="text-slate-500 text-xs mt-1">{item.data}</Text>
                  </View>
                  <View className="items-end gap-2">
                    <Text className="text-lime-400 font-bold text-base">{formatCurrency(item.valor)}</Text>
                    <TouchableOpacity
                      className="bg-red-900 p-2 rounded-lg"
                      onPress={() => handleDelete(item.id, item.descricao)}
                    >
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-900 rounded-t-3xl px-5 pt-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-lg font-bold">Nova Receita</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
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
              className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
              placeholder="Data (AAAA-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={form.data}
              onChangeText={(v) => setForm({ ...form, data: v })}
            />

            <TouchableOpacity
              className="bg-lime-500 p-4 rounded-lg"
              onPress={handleSubmit}
              disabled={criarReceita.isPending}
            >
              {criarReceita.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black font-bold text-center">Salvar</Text>
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
            <Text className="text-white font-bold text-base mb-3">Categoria</Text>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat}
                className={`p-3 rounded-lg mb-1 ${form.categoria === cat ? 'bg-lime-900' : ''}`}
                onPress={() => { setForm({ ...form, categoria: cat }); setCatModalVisible(false); }}
              >
                <Text className={`${form.categoria === cat ? 'text-lime-400 font-bold' : 'text-slate-300'}`}>
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
