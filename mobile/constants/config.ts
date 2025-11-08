import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

// Supabase Configuration (replacing Auth0)
export const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || '';
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || '';

// OAuth Redirect URI for mobile
export const REDIRECT_URI = 'nautilink://auth/callback';

export const ROLES = {
  PUBLIC_TRUST: 'public-trust',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
  TOP_SECRET: 'top-secret',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
