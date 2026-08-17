import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SAVED_USER_KEY = 'nextgarage_current_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SAVED_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync token and load user profile on startup
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = getAuthToken();
      if (!existingToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const profile = await api.getCurrentUser();
        setUser(profile);
        localStorage.setItem(SAVED_USER_KEY, JSON.stringify(profile));
      } catch (error) {
        console.warn('Session expired or invalid, logging out:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const session = await api.login(username, password);
    setToken(session.token);
    setUser(session.user);
    try {
      localStorage.setItem(SAVED_USER_KEY, JSON.stringify(session.user));
    } catch {
      // ignore
    }
    return session.user;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(SAVED_USER_KEY);
    } catch {
      // ignore
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getCurrentUser();
      setUser(profile);
      localStorage.setItem(SAVED_USER_KEY, JSON.stringify(profile));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isStaff = user?.role === 'staff';
  const canDelete = isSuperAdmin;
  const canManageUsers = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSuperAdmin,
        isStaff,
        canDelete,
        canManageUsers,
        login,
        logout,
        refreshProfile,
      }}
    >
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
