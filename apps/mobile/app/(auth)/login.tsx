import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const { login } = useAuth();

  function handleSubmit() {
    const trimmed = phone.trim();
    if (trimmed.length < 10) return;
    login(trimmed);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <Text className="text-4xl font-bold text-primary text-center mb-2">5mevsim</Text>
          <Text className="text-base text-gray-500 text-center mb-10">Hesabınıza giriş yapın</Text>

          <Text className="text-sm font-medium text-gray-700 mb-1.5">Telefon Numarası</Text>
          <TextInput
            className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 mb-4"
            placeholder="0555 123 45 67"
            keyboardType="phone-pad"
            maxLength={14}
            value={phone}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            className="w-full bg-primary rounded-xl py-4 items-center"
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text className="text-white text-base font-semibold">Doğrulama Kodu Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
