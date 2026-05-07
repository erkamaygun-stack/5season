import '../global.css';
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth-context';

function NavigationGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { role } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const inAuth = segments[0] === '(auth)';

    if (!role) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth || (segments as string[]).length === 0) {
      if (role === 'parent') router.replace('/(parent)');
      else if (role === 'coach') router.replace('/(coach)');
    }
  }, [role, segments, mounted]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}
