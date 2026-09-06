import '../global.css';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

function NavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { role, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function handleAuthLink(url: string | null) {
      if (!url) return;
      const parsed = new URL(url);
      const query = new URLSearchParams(parsed.search);
      const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
      const code = query.get('code');
      const accessToken = hash.get('access_token') ?? query.get('access_token');
      const refreshToken = hash.get('refresh_token') ?? query.get('refresh_token');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) router.replace('/(auth)/update-password');
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error) router.replace('/(auth)/update-password');
      }
    }

    void Linking.getInitialURL().then(handleAuthLink);
    const subscription = Linking.addEventListener('url', ({ url }) => { void handleAuthLink(url); });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!mounted || loading) return;

    const currentSegments = segments as readonly string[];
    const inAuth = currentSegments[0] === '(auth)';
    const updatingPassword = inAuth && currentSegments[1] === 'update-password';

    if (!role) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const onCorrectSection = currentSegments[0] === '(coach)';

    if (!onCorrectSection && !updatingPassword) {
      router.replace('/(coach)');
    }
  }, [role, segments, mounted, loading, router]);

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
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        <NavigationGuard />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
