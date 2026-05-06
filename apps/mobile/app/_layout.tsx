import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';

// Geçici sabit — gerçek auth gelince Supabase session ile değiştirilecek
const MOCK_AUTH = {
  isAuthenticated: true,
  role: 'parent' as 'parent' | 'coach' | null,
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';

    if (!MOCK_AUTH.isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth || segments.length === 0) {
      if (MOCK_AUTH.role === 'parent') {
        router.replace('/(parent)');
      } else if (MOCK_AUTH.role === 'coach') {
        router.replace('/(coach)');
      }
    }
  }, [segments]);

  return <Slot />;
}
