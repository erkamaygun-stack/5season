import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOtp, phone } = useAuth();
  const router = useRouter();

  async function handleVerify() {
    if (code.length < 6) return;
    setLoading(true);
    // Fake gecikme — gerçek SMS gelince burada Supabase auth.verifyOtp çağrısı olacak
    await new Promise((r) => setTimeout(r, 800));
    verifyOtp(code);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">Kodu Girin</Text>
        <Text className="text-sm text-gray-500 text-center mb-8">
          {phone ? `${phone} numarasına gönderilen 6 haneli kodu girin` : '6 haneli kodu girin'}
        </Text>

        <TextInput
          className="w-full border border-gray-300 rounded-xl px-4 py-4 text-center text-2xl tracking-widest text-gray-900 mb-4"
          placeholder="------"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity
          className={`w-full rounded-xl py-4 items-center mb-3 ${code.length === 6 ? 'bg-primary' : 'bg-gray-200'}`}
          onPress={handleVerify}
          disabled={code.length < 6 || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`text-base font-semibold ${code.length === 6 ? 'text-white' : 'text-gray-400'}`}>
              Giriş Yap
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="items-center py-2">
          <Text className="text-sm text-gray-500">Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
