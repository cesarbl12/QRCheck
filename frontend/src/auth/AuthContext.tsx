import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';

export type Role = 'ADMIN' | 'SCANNER';

interface AuthUser {
  username: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qrcheck_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ username: string; role: Role }>('/auth/me')
      .then((res) => setUser({ username: res.data.username, role: res.data.role }))
      .catch(() => {
        localStorage.removeItem('qrcheck_token');
        localStorage.removeItem('qrcheck_role');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const res = await api.post<{ accessToken: string; username: string; role: Role }>(
      '/auth/login',
      { username, password },
    );
    localStorage.setItem('qrcheck_token', res.data.accessToken);
    localStorage.setItem('qrcheck_role', res.data.role);
    const authUser = { username: res.data.username, role: res.data.role };
    setUser(authUser);
    return authUser;
  }

  function logout() {
    localStorage.removeItem('qrcheck_token');
    localStorage.removeItem('qrcheck_role');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
