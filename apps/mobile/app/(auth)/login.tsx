import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import * as Linking from 'expo-linking';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const { login, requestPasswordReset } = useAuth();

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const isValid = emailValid && (resetMode || password.length >= 8);

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    if (resetMode) {
      const redirectTo = Linking.createURL('/update-password');
      const { error: resetError } = await requestPasswordReset(email, redirectTo);
      setLoading(false);
      if (resetError) setError(resetError);
      else setMessage('Parola sıfırlama bağlantısı e-posta adresinize gönderildi.');
      return;
    }
    const { error: loginError } = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (loginError) setError(loginError);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center items-center">
          <Image
            source={require('../../assets/5mevsim.png')}
            style={{ width: 220, height: 220 }}
            resizeMode="contain"
          />
        </View>

        <View className="px-6 pb-10">
          <Text className="text-3xl font-bold text-gray-900 mb-2" style={{ letterSpacing: 1 }}>
            {resetMode ? 'PAROLA SIFIRLA' : 'ANTRENÖR GİRİŞİ'}
          </Text>
          <Text className="text-sm text-gray-500 mb-6">
            {resetMode
              ? 'Hesabınıza kayıtlı e-posta adresine güvenli bir bağlantı gönderelim.'
              : 'Yönetici tarafından davet edilen e-posta adresinizle giriş yapın.'}
          </Text>

          <TextInput
            className="w-full rounded-xl px-4 text-base text-gray-900 mb-3"
            style={{
              paddingVertical: 14,
              borderWidth: 2,
              borderColor: focused === 'email' ? '#dc2626' : '#e5e7eb',
            }}
            placeholder="antrenor@ornek.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(value) => { setEmail(value); setError(null); }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            editable={!loading}
            returnKeyType="next"
          />

          {!resetMode && (
            <TextInput
              className="w-full rounded-xl px-4 text-base text-gray-900"
              style={{
                paddingVertical: 14,
                borderWidth: 2,
                borderColor: focused === 'password' ? '#dc2626' : '#e5e7eb',
              }}
              placeholder="Parola"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={(value) => { setPassword(value); setError(null); }}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          )}

          <View style={{ minHeight: 40, justifyContent: 'center' }}>
            {error ? <Text className="text-red-500 text-xs">{error}</Text> : null}
            {message ? <Text className="text-green-600 text-xs">{message}</Text> : null}
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
                {resetMode ? 'Bağlantı Gönder' : 'Giriş Yap'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-4"
            onPress={() => { setResetMode((value) => !value); setError(null); setMessage(null); }}
            disabled={loading}
          >
            <Text className="text-sm font-medium text-red-600">
              {resetMode ? 'Giriş ekranına dön' : 'Parolamı unuttum'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
