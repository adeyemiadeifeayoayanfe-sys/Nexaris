import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchViewer } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { AuthProfile } from '../types';

type AuthContextValue = {
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function hydrate(nextSession: Session | null) {
      if (!mounted) {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.access_token) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { user } = await fetchViewer(nextSession.access_token);

        if (mounted) {
          setProfile(user);
          setError(null);
        }
      } catch (viewerError) {
        if (mounted) {
          setProfile(null);
          setError(viewerError instanceof Error ? viewerError.message : 'Unable to load account.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      error,
      signOut: async () => {
        if (!supabase) {
          return;
        }

        await supabase.auth.signOut();
      }
    }),
    [error, loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
