import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacoesAPI } from '@/lib/api';
import { Bell, Check, Trash2 } from 'lucide-react-native';

export default function NotificacoesScreen() {
  const queryClient = useQueryClient();

  const { data: notificacoes, isLoading, refetch } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => notificacoesAPI.listar(),
    select: (response) => response.data,
  });

  const marcarLida = useMutation({
    mutationFn: (id: number) => notificacoesAPI.marcarLida(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const deletar = useMutation({
    mutationFn: (id: number) => notificacoesAPI.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Confirmar', 'Deletar esta notificacao?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deletar', style: 'destructive', onPress: () => deletar.mutate(id) },
    ]);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'vencimento': return '#f59e0b';
      case 'meta': return '#a3e635';
      case 'orcamento': return '#ef4444';
      default: return '#64748b';
    }
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
          <View className="flex-row items-center gap-2 mb-6">
            <Bell color="#a3e635" size={22} />
            <Text className="text-white text-xl font-bold">Notificacoes</Text>
          </View>

          {(!notificacoes || notificacoes.length === 0) ? (
            <View className="bg-slate-800 p-8 rounded-xl items-center">
              <Text className="text-slate-400 text-center">Nenhuma notificacao</Text>
            </View>
          ) : (
            notificacoes.map((item: any) => (
              <View
                key={item.id}
                className={`bg-slate-800 p-4 rounded-xl border mb-3 ${item.lida ? 'border-slate-700' : 'border-lime-800'}`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTipoColor(item.tipo) }}
                      />
                      <Text className="text-white font-bold text-sm">{item.titulo}</Text>
                    </View>
                    <Text className="text-slate-400 text-sm">{item.mensagem}</Text>
                    <Text className="text-slate-600 text-xs mt-1">{item.created_at}</Text>
                  </View>
                </View>

                <View className="flex-row justify-end gap-2 mt-2">
                  {!item.lida && (
                    <TouchableOpacity
                      className="bg-slate-700 p-2 rounded-lg flex-row items-center gap-1"
                      onPress={() => marcarLida.mutate(item.id)}
                    >
                      <Check color="#a3e635" size={14} />
                      <Text className="text-slate-300 text-xs">Lida</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    className="bg-red-900 p-2 rounded-lg"
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 color="#ef4444" size={14} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
