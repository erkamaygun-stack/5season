import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  async function handleSubmit() {
    const trimmed = phone.trim();
    if (trimmed.length < 10) return;
    setError(null);
    setLoading(true);
    const { error: err } = await login(trimmed);
    setLoading(false);
    if (err) setError(err);
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
            onChangeText={(t) => { setPhone(t); setError(null); }}
            editable={!loading}
          />

          {error && (
            <Text className="text-red-500 text-sm mb-3 text-center">{error}</Text>
          )}

          <TouchableOpacity
            className={`w-full rounded-xl py-4 items-center ${phone.trim().length >= 10 && !loading ? 'bg-primary' : 'bg-gray-200'}`}
            onPress={handleSubmit}
            disabled={phone.trim().length < 10 || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className={`text-base font-semibold ${phone.trim().length >= 10 ? 'text-white' : 'text-gray-400'}`}>
                Doğrulama Kodu Gönder
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
