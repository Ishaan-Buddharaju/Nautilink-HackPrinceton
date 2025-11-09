import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { AuthContextType, User } from '../types';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_REDIRECT_URI } from '../constants/config';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize auth request
  const [request, result, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AUTH0_REDIRECT_URI,
    },
    discovery
  );

  // Load user from secure storage on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Handle auth result
  useEffect(() => {
    if (result?.type === 'success') {
      const { code } = result.params;
      exchangeCodeForToken(code);
    }
  }, [result]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const userJson = await SecureStore.getItemAsync('user');
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: AUTH0_CLIENT_ID,
          code,
          redirect_uri: AUTH0_REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.access_token) {
        // Get user info
        const userInfoResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        const userInfo = await userInfoResponse.json();

        // Store user data
        const userData: User = {
          sub: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          roles: userInfo['https://myapp.example.com/roles'] || [],
          permissions: userInfo.permissions || [],
        };

        await SecureStore.setItemAsync('user', JSON.stringify(userData));
        await SecureStore.setItemAsync('access_token', tokens.access_token);
        
        setUser(userData);
      }
    } catch (err) {
      console.error('Error exchanging code:', err);
      setError(err as Error);
    }
  };

  const login = useCallback(async () => {
    try {
      setError(null);
      await promptAsync();
    } catch (err) {
      console.error('Login error:', err);
      setError(err as Error);
    }
  }, [promptAsync]);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('access_token');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err as Error);
    }
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  }, [hasRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        hasRole,
        hasAnyRole,
      }}
    >
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
