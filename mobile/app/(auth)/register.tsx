import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!nome || !email || !senha || !confirmarSenha) {
      setError('Preencha todos os campos');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas nao coincidem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(nome, email, senha);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center px-6">
      <Text className="text-3xl font-bold text-white mb-8 text-center">Criar Conta</Text>

      {error ? (
        <View className="bg-red-900 p-4 rounded-lg mb-4">
          <Text className="text-red-100">{error}</Text>
        </View>
      ) : null}

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
        placeholder="Nome"
        placeholderTextColor="#94a3b8"
        value={nome}
        onChangeText={setNome}
        editable={!loading}
      />

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        keyboardType="email-address"
      />

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
        placeholder="Senha"
        placeholderTextColor="#94a3b8"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-6 border border-slate-700"
        placeholder="Confirmar Senha"
        placeholderTextColor="#94a3b8"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        className="bg-lime-500 p-4 rounded-lg mb-4"
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black font-bold text-center">Registrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text className="text-slate-400 text-center">
          Ja tem conta? <Text className="text-lime-500 font-bold">Entrar</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
