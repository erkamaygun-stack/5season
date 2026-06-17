import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { supabase } from './supabase';

type Role = 'parent' | 'coach';

type AuthState = {
  phone: string | null;
  role: Role | null;
  name: string | null;
  userId: string | null;
  schoolId: string | null;
  schoolName: string | null;
  logoUrl: string | null;
  staffId: string | null;   // sadece coach rolü
  groupName: string | null; // sadece coach rolü
  loading: boolean;
};

type AuthContextType = AuthState & {
  login: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (code: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('0')) return `+90${digits.slice(1)}`;
  return `+90${digits}`;
}

const EMPTY_STATE: AuthState = {
  phone: null,
  role: null,
  name: null,
  userId: null,
  schoolId: null,
  schoolName: null,
  logoUrl: null,
  staffId: null,
  groupName: null,
  loading: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...EMPTY_STATE, loading: true });

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately with stored session (if any)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone ?? null);
      } else {
        setState({ ...EMPTY_STATE });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, phone: string | null) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, school_id, schools(name, logo_url)')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      setState((s) => ({ ...s, phone, role: 'parent', name: 'Kullanıcı', userId, schoolId: null, schoolName: null, logoUrl: null, staffId: null, groupName: null, loading: false }));
      return;
    }

    const schoolRow = profile.schools as unknown as { name: string; logo_url: string | null } | null;
    const schoolName = schoolRow?.name ?? null;
    const logoUrl = schoolRow?.logo_url ?? null;
    const schoolId = profile.school_id ?? null;

    let staffId: string | null = null;
    let groupName: string | null = null;

    if (profile.role === 'coach') {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      console.log('[fetchProfile] staffData:', staffData, 'staffError:', staffError);

      if (staffData) {
        staffId = staffData.id;

        const { data: groupData } = await supabase
          .from('groups')
          .select('name')
          .eq('primary_coach_id', staffId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        groupName = groupData?.name ?? null;
      }
    }

    setState({
      phone,
      role: profile.role as Role,
      name: profile.full_name,
      userId,
      schoolId,
      schoolName,
      logoUrl,
      staffId,
      groupName,
      loading: false,
    });
  }

  async function login(phone: string): Promise<{ error: string | null }> {
    const e164 = toE164(phone);

    // Telefon numarasının sistemde kayıtlı olup olmadığını kontrol et (bilinmeyen numaralara SMS gönderme)
    const { data, error: rpcError } = await supabase.rpc('check_mobile_phone', { p_phone: e164 });

    if (rpcError) {
      return { error: 'Bağlantı hatası. Lütfen tekrar deneyin.' };
    }

    if (!data?.exists) {
      return { error: 'Bu telefon numarası sisteme kayıtlı değil.' };
    }

    // SMS OTP gönder
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      return { error: 'SMS gönderilemedi. Lütfen tekrar deneyin.' };
    }

    setState((s) => ({ ...s, phone: e164 }));
    router.push('/(auth)/otp');
    return { error: null };
  }

  async function verifyOtp(code: string): Promise<{ error: string | null }> {
    const phone = state.phone;
    if (!phone) {
      return { error: 'Oturum bilgisi bulunamadı. Lütfen telefon numaranızı tekrar girin.' };
    }

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    if (error) {
      return { error: 'Hatalı veya süresi dolmuş kod. Lütfen tekrar deneyin.' };
    }

    return { error: null };
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    setState({ ...EMPTY_STATE });
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
