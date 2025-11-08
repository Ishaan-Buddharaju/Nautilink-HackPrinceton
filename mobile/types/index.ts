export interface User {
  sub: string;
  name: string;
  email: string;
  picture?: string;
  roles?: string[];
  permissions?: string[];
}

export interface VesselData {
  lat: number;
  lng: number;
  registered: boolean;
  timestamp: string;
  geartype: string;
  mmsi: string;
  imo: string;
  shipName: string;
  flag: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (provider?: 'google' | 'azure') => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}
