import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const ADMIN_PASSWORD = '6890';
const STORAGE_KEY = 'admin_authenticated';

interface AdminAuthContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isAdmin) sessionStorage.setItem(STORAGE_KEY, 'true');
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  const login = useCallback((password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      try { localStorage.setItem('admin_password_v1', password); } catch { /* ignore */ }
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAdmin(false), []);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
