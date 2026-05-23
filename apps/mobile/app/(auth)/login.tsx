import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length === 10;

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setLoading(true);
    const { error: err } = await login(digits);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View className="flex-1 justify-center items-center">
          <Image
            source={require('../../assets/5mevsim.png')}
            style={{ width: 220, height: 220 }}
            resizeMode="contain"
          />
        </View>

        {/* Form */}
        <View className="px-6 pb-10">
          <Text
            className="text-3xl font-bold text-gray-900 mb-6"
            style={{ letterSpacing: 1 }}
          >
            GİRİŞ YAP
          </Text>

          <View
            className="flex-row items-stretch rounded-xl overflow-hidden mb-1"
            style={{
              borderWidth: 2,
              borderColor: focused ? '#dc2626' : '#e5e7eb',
            }}
          >
            <View
              className="items-center justify-center px-4"
              style={{ backgroundColor: '#f9fafb', borderRightWidth: 1, borderRightColor: '#e5e7eb' }}
            >
              <Text className="text-sm font-bold text-gray-500">+90</Text>
            </View>
            <TextInput
              className="flex-1 px-4 text-base text-gray-900"
              style={{ paddingVertical: 14 }}
              placeholder="5551234567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(null); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              editable={!loading}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <View className="items-center justify-center pr-4" style={{ width: 36 }}>
              {isValid && <Text style={{ color: '#22c55e', fontSize: 18 }}>✓</Text>}
            </View>
          </View>

          <View style={{ height: 20, justifyContent: 'center', marginBottom: 16 }}>
            {error ? <Text className="text-red-500 text-xs">{error}</Text> : null}
          </View>

          <TouchableOpacity
            className={`w-full rounded-xl py-4 items-center ${isValid && !loading ? 'bg-primary' : 'bg-gray-100'}`}
            onPress={handleSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={isValid ? '#fff' : '#9ca3af'} />
            ) : (
              <Text className={`text-base font-semibold ${isValid ? 'text-white' : 'text-gray-400'}`}>
                Doğrulama Kodu Gönder
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
