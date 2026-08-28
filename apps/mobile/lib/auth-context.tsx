import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { supabase } from './supabase';

type AuthState = {
  email: string | null;
  role: 'coach' | null;
  name: string | null;
  userId: string | null;
  schoolId: string | null;
  schoolName: string | null;
  logoUrl: string | null;
  staffId: string | null;
  groupName: string | null;
  loading: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const EMPTY_STATE: AuthState = {
  email: null,
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchCoachProfile(session.user.id, session.user.email ?? null);
      } else {
        setState({ ...EMPTY_STATE });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchCoachProfile(userId: string, email: string | null): Promise<boolean> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, school_id, is_active, schools(name, logo_url)')
      .eq('id', userId)
      .single();

    if (error || !profile || profile.role !== 'coach' || profile.is_active === false) {
      await supabase.auth.signOut();
      setState({ ...EMPTY_STATE });
      return false;
    }

    const schoolRow = profile.schools as unknown as { name: string; logo_url: string | null } | null;
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    let groupName: string | null = null;
    if (staffData) {
      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('primary_coach_id', staffData.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      groupName = groupData?.name ?? null;
    }

    setState({
      email,
      role: 'coach',
      name: profile.full_name,
      userId,
      schoolId: profile.school_id ?? null,
      schoolName: schoolRow?.name ?? null,
      logoUrl: schoolRow?.logo_url ?? null,
      staffId: staffData?.id ?? null,
      groupName,
      loading: false,
    });
    return true;
  }

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { error: 'E-posta veya parola hatalı.' };
    }

    const isCoach = await fetchCoachProfile(data.user.id, data.user.email ?? email);
    if (!isCoach) {
      return { error: 'Bu hesap aktif bir antrenör hesabı değil.' };
    }

    return { error: null };
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    setState({ ...EMPTY_STATE });
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
