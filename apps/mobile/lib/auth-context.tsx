import { createContext, useContext, useState, ReactNode } from 'react';
import { router } from 'expo-router';

type Role = 'parent' | 'coach';

type AuthState = {
  phone: string | null;
  role: Role | null;
  name: string | null;
};

type AuthContextType = AuthState & {
  login: (phone: string) => void;
  verifyOtp: (code: string) => void;
  logout: () => void;
};

type MockUser = { role: Role; name: string };

const AuthContext = createContext<AuthContextType | null>(null);

// Mock kullanıcı ataması — gerçek Supabase auth gelince kaldırılacak
function mockUserForPhone(phone: string): MockUser {
  const normalized = phone.replace(/\s/g, '');
  if (normalized === '05551234568') return { role: 'coach', name: 'Mehmet Demir' };
  return { role: 'parent', name: 'Ayşe Yılmaz' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ phone: null, role: null, name: null });

  function login(phone: string) {
    setState((s) => ({ ...s, phone }));
    router.push('/(auth)/otp');
  }

  function verifyOtp(_code: string) {
    if (!state.phone) return;
    const { role, name } = mockUserForPhone(state.phone);
    setState((s) => ({ ...s, role, name }));
    if (role === 'parent') {
      router.replace('/(parent)');
    } else {
      router.replace('/(coach)');
    }
  }

  function logout() {
    setState({ phone: null, role: null, name: null });
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ ...state, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
