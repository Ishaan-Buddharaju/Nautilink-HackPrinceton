'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface User {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  roles?: string[];
  permissions?: string[];
}

interface UseAuthReturn {
  user: User | null;
  error: Error | null;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const populateFromSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const sessionUser = data.session?.user;

        if (sessionUser) {
          const mappedUser: User = {
            sub: sessionUser.id,
            name:
              sessionUser.user_metadata?.full_name ||
              sessionUser.user_metadata?.name ||
              sessionUser.email ||
              'User',
            email: sessionUser.email ?? '',
            picture:
              sessionUser.user_metadata?.avatar_url ||
              sessionUser.user_metadata?.picture,
            roles:
              sessionUser.app_metadata?.roles ||
              (sessionUser.user_metadata?.roles as string[]) ||
              [],
            permissions:
              (sessionUser.app_metadata?.permissions as string[]) ||
              (sessionUser.user_metadata?.permissions as string[]) ||
              [],
          };

          setUser(mappedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error loading Supabase session:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    populateFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const sessionUser = session.user;
        setUser({
          sub: sessionUser.id,
          name:
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email ||
            'User',
          email: sessionUser.email ?? '',
          picture:
            sessionUser.user_metadata?.avatar_url ||
            sessionUser.user_metadata?.picture,
          roles:
            sessionUser.app_metadata?.roles ||
            (sessionUser.user_metadata?.roles as string[]) ||
            [],
          permissions:
            (sessionUser.app_metadata?.permissions as string[]) ||
            (sessionUser.user_metadata?.permissions as string[]) ||
            [],
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper functions for role and permission checking
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  return { 
    user, 
    error, 
    isLoading, 
    hasRole, 
    hasPermission, 
    hasAnyRole, 
    hasAnyPermission 
  };
}
