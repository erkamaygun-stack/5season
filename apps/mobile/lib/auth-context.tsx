import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { supabase } from './supabase';

type Role = 'parent' | 'coach';

type AuthState = {
  phone: string | null;
  role: Role | null;
  name: string | null;
  userId: string | null;
  loading: boolean;
};

type AuthContextType = AuthState & {
  login: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (code: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Türk telefon numarasını E.164 formatına çevirir: 05xx → +905xx
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
  return `+90${digits}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    phone: null,
    role: null,
    name: null,
    userId: null,
    loading: true,
  });

  // Uygulama açıldığında mevcut oturumu kontrol et
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone ?? null);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone ?? null);
      } else {
        setState({ phone: null, role: null, name: null, userId: null, loading: false });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, phone: string | null) {
    // profiles tablosundan rol ve isim çekiliyor
    // const { data } = await supabase
    //   .from('profiles')
    //   .select('role, full_name')
    //   .eq('id', userId)
    //   .single();
    // const role: Role = data?.role === 'coach' ? 'coach' : 'parent';
    // const name: string = data?.full_name ?? '';

    // TODO: profiles tablosu hazır olduğunda yukarıdaki bloğu aktif et,
    // aşağıdaki geçici satırları kaldır.
    const role: Role = 'parent';
    const name = '';

    setState({ phone, role, name, userId, loading: false });
  }

  async function login(phone: string): Promise<{ error: string | null }> {
    const e164 = toE164(phone);
    setState((s) => ({ ...s, phone: e164 }));

    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
    });

    if (error) return { error: error.message };

    router.push('/(auth)/otp');
    return { error: null };
  }

  async function verifyOtp(code: string): Promise<{ error: string | null }> {
    if (!state.phone) return { error: 'Telefon numarası bulunamadı' };

    const { data, error } = await supabase.auth.verifyOtp({
      phone: state.phone,
      token: code,
      type: 'sms',
    });

    if (error) return { error: error.message };

    // fetchProfile onAuthStateChange üzerinden tetiklenir,
    // burada sadece yönlendirme yapıyoruz.
    const session = data.session;
    if (!session) return { error: 'Oturum oluşturulamadı' };

    return { error: null };
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  // role belirlendikten sonra uygun sekmeye yönlendir
  useEffect(() => {
    if (state.loading) return;
    if (!state.userId) return;
    if (state.role === 'coach') {
      router.replace('/(coach)');
    } else if (state.role === 'parent') {
      router.replace('/(parent)');
    }
  }, [state.role, state.userId, state.loading]);

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
