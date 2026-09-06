import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

export default function UpdatePasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 8 && password === confirmation;

  async function submit() {
    if (!valid) return;
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/(coach)');
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-center">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">Yeni parola</Text>
        <Text className="text-sm text-gray-500 mt-2">En az 8 karakterli yeni parolanızı belirleyin.</Text>
      </View>

      <TextInput
        className="w-full rounded-xl px-4 text-base text-gray-900 border-2 border-gray-200 mb-3"
        style={{ paddingVertical: 14 }}
        placeholder="Yeni parola"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />
      <TextInput
        className="w-full rounded-xl px-4 text-base text-gray-900 border-2 border-gray-200"
        style={{ paddingVertical: 14 }}
        placeholder="Yeni parola tekrar"
        secureTextEntry
        value={confirmation}
        onChangeText={setConfirmation}
        editable={!loading}
      />

      <View style={{ minHeight: 44, justifyContent: 'center' }}>
        {confirmation && password !== confirmation
          ? <Text className="text-red-500 text-xs">Parolalar eşleşmiyor.</Text>
          : null}
        {error ? <Text className="text-red-500 text-xs">{error}</Text> : null}
      </View>

      <TouchableOpacity
        className={`w-full rounded-xl py-4 items-center ${valid && !loading ? 'bg-primary' : 'bg-gray-100'}`}
        onPress={submit}
        disabled={!valid || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text className={`font-semibold ${valid ? 'text-white' : 'text-gray-400'}`}>Parolayı Kaydet</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
