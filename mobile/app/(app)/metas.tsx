import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Modal, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Trash2, X, Target } from 'lucide-react-native';

export default function MetasScreen() {
  const queryClient = useQueryClient();

  const { data: metas, isLoading, refetch } = useQuery({
    queryKey: ['metas'],
    queryFn: () => api.get('/metas'),
    select: (response) => response.data,
  });

  const criarMeta = useMutation({
    mutationFn: (data: any) => api.post('/metas', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metas'] }),
  });

  const deletarMeta = useMutation({
    mutationFn: (id: number) => api.delete(`/metas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metas'] }),
  });

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [form, setForm] = useState({
    descricao: '',
    valor_alvo: '',
    valor_atual: '',
    prazo: '',
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
    setForm({ descricao: '', valor_alvo: '', valor_atual: '', prazo: '' });
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.valor_alvo) {
      Alert.alert('Erro', 'Preencha descricao e valor alvo');
      return;
    }

    try {
      await criarMeta.mutateAsync({
        descricao: form.descricao,
        valor_alvo: parseFloat(form.valor_alvo),
        valor_atual: form.valor_atual ? parseFloat(form.valor_atual) : 0,
        prazo: form.prazo || null,
      });
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.detail || 'Erro ao criar meta');
    }
  };

  const handleDelete = (id: number, descricao: string) => {
    Alert.alert('Confirmar', `Deletar "${descricao}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deletar', style: 'destructive', onPress: () => deletarMeta.mutate(id) },
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
            <Text className="text-white text-xl font-bold">Metas</Text>
            <TouchableOpacity
              className="bg-lime-500 px-4 py-2 rounded-lg flex-row items-center gap-2"
              onPress={() => setModalVisible(true)}
            >
              <Plus color="#000" size={18} />
              <Text className="text-black font-bold">Nova</Text>
            </TouchableOpacity>
          </View>

          {(!metas || metas.length === 0) ? (
            <View className="bg-slate-800 p-8 rounded-xl items-center">
              <Text className="text-slate-400 text-center">Nenhuma meta encontrada</Text>
            </View>
          ) : (
            metas.map((item: any) => {
              const progresso = item.valor_alvo > 0
                ? Math.min((item.valor_atual / item.valor_alvo) * 100, 100)
                : 0;

              return (
                <View key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Target color={item.concluida ? '#a3e635' : '#f59e0b'} size={18} />
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base">{item.descricao}</Text>
                        {item.prazo && (
                          <Text className="text-slate-500 text-xs mt-1">Prazo: {item.prazo}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      className="bg-red-900 p-2 rounded-lg"
                      onPress={() => handleDelete(item.id, item.descricao)}
                    >
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-400 text-sm">{formatCurrency(item.valor_atual)}</Text>
                    <Text className="text-slate-400 text-sm">{formatCurrency(item.valor_alvo)}</Text>
                  </View>

                  <View className="bg-slate-700 h-3 rounded-full overflow-hidden">
                    <View
                      className={`h-full rounded-full ${item.concluida ? 'bg-lime-500' : 'bg-amber-500'}`}
                      style={{ width: `${progresso}%` }}
                    />
                  </View>
                  <Text className="text-slate-500 text-xs mt-1 text-right">{progresso.toFixed(0)}%</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-900 rounded-t-3xl px-5 pt-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-lg font-bold">Nova Meta</Text>
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

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-3 border border-slate-700"
              placeholder="Valor alvo"
              placeholderTextColor="#94a3b8"
              value={form.valor_alvo}
              onChangeText={(v) => setForm({ ...form, valor_alvo: v })}
              keyboardType="decimal-pad"
            />

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-3 border border-slate-700"
              placeholder="Valor atual (opcional)"
              placeholderTextColor="#94a3b8"
              value={form.valor_atual}
              onChangeText={(v) => setForm({ ...form, valor_atual: v })}
              keyboardType="decimal-pad"
            />

            <TextInput
              className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
              placeholder="Prazo (AAAA-MM-DD, opcional)"
              placeholderTextColor="#94a3b8"
              value={form.prazo}
              onChangeText={(v) => setForm({ ...form, prazo: v })}
            />

            <TouchableOpacity
              className="bg-lime-500 p-4 rounded-lg"
              onPress={handleSubmit}
              disabled={criarMeta.isPending}
            >
              {criarMeta.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black font-bold text-center">Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
