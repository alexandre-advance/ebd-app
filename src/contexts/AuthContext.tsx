import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Church } from '@/src/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  church: Church | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [church, setChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    if (user) {
      await fetchProfileAndChurch(user.id);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndChurch(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndChurch(session.user.id);
      } else {
        setProfile(null);
        setChurch(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfileAndChurch(userId: string) {
    try {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Fetch Church if user belongs to one
        if (profileData.church_id) {
          const { data: churchData } = await supabase
            .from('churches')
            .select('*')
            .eq('id', profileData.church_id)
            .single();
          
          if (churchData) {
            setChurch(churchData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching auth data:', error);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, church, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
