import { create } from 'zustand';
import { getSupabaseClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string;
  referral_code: string;
  mfa_enabled: boolean;
  rating: number;
  reviews_count: number;
  verified: boolean;
  phone_number: string | null;
  location: string | null;
  created_at: string;
  listing_count: number;
  email_verified: boolean;
  phone_verified: boolean;
  // Add other profile properties here
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  challengeId: string | null;
  factorId: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (user: User) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  mfaRequired: false,
  challengeId: null,
  factorId: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "A multi-factor authentication challenge is required") {
          const mfaError: any = error; // Cast to any to access next_step
          if (mfaError.next_step && mfaError.next_step.type === "mfa_required") {
            set({
              mfaRequired: true,
              challengeId: mfaError.next_step.challenge_id,
              factorId: mfaError.next_step.factor_id,
              loading: false,
            });
            return; // MFA required, stop here
          }
        }
        throw error; // Re-throw other errors
      }

      set({ user: data.user, isAuthenticated: !!data.user, loading: false, mfaRequired: false });
      if (data.user) {
        await get().fetchProfile(data.user);
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error; // Re-throw for component to catch
    }
  },
  loginWithGoogle: async (redirectTo) => {
    set({ loading: true, error: null });
    const supabase = getSupabaseClient();
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error; // Re-throw for component to catch
    }
  },
  logout: async () => {
    set({ loading: true, error: null });
    const supabase = getSupabaseClient();
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, isAuthenticated: false, loading: false, mfaRequired: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error; // Re-throw for component to catch
    }
  },
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, loading: false });
    if (user) {
      get().fetchProfile(user);
    }
  },
  setProfile: (profile) => {
    set({ profile });
  },
  fetchProfile: async (user) => {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        set({ profile: null });
        return;
      }
      set({ profile: data });
    } catch (error) {
      console.error('Error in refreshing profile:', error);
      set({ profile: null });
    }
  },
  verifyMfa: async (code: string) => {
    set({ loading: true, error: null });
    const { challengeId, factorId } = get();
    const supabase = getSupabaseClient();

    if (!challengeId || !factorId) {
      const err = new Error("MFA challenge or factor ID missing.");
      set({ error: err.message, loading: false });
      throw err;
    }

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (error) throw error;

      set({ user: data.user, isAuthenticated: !!data.user, loading: false, mfaRequired: false, challengeId: null, factorId: null });
      if (data.user) {
        await get().fetchProfile(data.user);
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error; // Re-throw for component to catch
    }
  },
}));
