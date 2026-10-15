import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AdminUser } from '../types';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isSupabaseAuth: boolean;
}

const STORAGE_KEY_AUTH = 'cpr_library_admin_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const client = getSupabaseClient();

      if (client && isSupabaseConfigured()) {
        setIsSupabaseAuth(true);
        try {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || 'admin@cprlibrary.org',
              role: 'admin',
              last_login: session.user.last_sign_in_at,
            });
          }

          // Listen for Supabase auth state change
          const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            if (session?.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || 'admin@cprlibrary.org',
                role: 'admin',
                last_login: session.user.last_sign_in_at,
              });
            } else {
              setUser(null);
            }
          });

          if (mounted) setLoading(false);

          return () => {
            authListener.subscription.unsubscribe();
          };
        } catch (err) {
          console.warn('Error reading Supabase auth session:', err);
        }
      }

      // Fallback / local session check
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUTH);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            setUser(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse local auth session', e);
      }

      if (mounted) setLoading(false);
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

        if (error) {
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const adminUser: AdminUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            role: 'admin',
            last_login: new Date().toISOString(),
          };
          setUser(adminUser);
          setLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        setLoading(false);
        return { success: false, error: err?.message || 'Supabase authentication failed.' };
      }
    }

    // Standard Demo / Administrative Credentials check
    // Allowed admin accounts:
    const validCredentials = [
      { email: 'cprmedicalacademy@gmail.com', pass: 'cprlibrary2026' },
      { email: 'admin@cprlibrary.org', pass: 'admin123' },
    ];

    const match = validCredentials.find(
      (c) => c.email.toLowerCase() === cleanEmail && c.pass === cleanPass
    );

    if (match) {
      const adminUser: AdminUser = {
        id: 'admin-' + Math.random().toString(36).substring(2, 9),
        email: match.email,
        role: 'admin',
        last_login: new Date().toISOString(),
      };
      setUser(adminUser);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(adminUser));
      setLoading(false);
      return { success: true };
    }

    setLoading(false);
    return {
      success: false,
      error: 'Invalid email or password. Please check your credentials or use the preconfigured demo login.',
    };
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error', e);
      }
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isSupabaseAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
