import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  tenantId: number;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const getStoredToken = () => {
  try { return localStorage.getItem('mediflow_token'); } catch { return null; }
};

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('mediflow_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const useAuth = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  setAuth: (token, user) => {
    localStorage.setItem('mediflow_token', token);
    localStorage.setItem('mediflow_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('mediflow_token');
    localStorage.removeItem('mediflow_user');
    set({ token: null, user: null });
  },
}));
