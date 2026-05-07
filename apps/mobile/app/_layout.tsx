import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth-context';

function NavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { role, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!role) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth || (segments as string[]).length === 0) {
      if (role === 'parent') router.replace('/(parent)');
      else if (role === 'coach') router.replace('/(coach)');
    }
  }, [role, segments, mounted, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}
