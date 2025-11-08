import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
export const AUTH0_DOMAIN = Constants.expoConfig?.extra?.auth0Domain || 'demo.auth0.com';
export const AUTH0_CLIENT_ID = Constants.expoConfig?.extra?.auth0ClientId || 'demo-client-id';
export const AUTH0_REDIRECT_URI = 'nautilink://callback';

export const ROLES = {
  PUBLIC_TRUST: 'public-trust',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
  TOP_SECRET: 'top-secret',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
