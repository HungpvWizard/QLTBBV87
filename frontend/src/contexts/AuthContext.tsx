import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axios';

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export type PermissionMap = Record<string, ModulePermission>;

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleId: number;
  isDefaultPassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  permissions: PermissionMap;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canView: (moduleCode: string) => boolean;
  canCreate: (moduleCode: string) => boolean;
  canEdit: (moduleCode: string) => boolean;
  canDelete: (moduleCode: string) => boolean;
  canExport: (moduleCode: string) => boolean;
  refreshPermissions: () => Promise<void>;
  clearDefaultPasswordWarning: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionMap>(() => {
    try {
      const cached = localStorage.getItem('assetflow_permissions');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const fetchMyPermissions = async () => {
    try {
      const res = await api.get('/permissions/my-permissions');
      if (res.data?.permissions) {
        setPermissions(res.data.permissions);
        localStorage.setItem('assetflow_permissions', JSON.stringify(res.data.permissions));
      }
    } catch (err) {
      console.warn("Lỗi nạp quyền người dùng:", err);
    }
  };

  const refreshPermissions = async () => {
    await fetchMyPermissions();
  };

  // Khôi phục session từ localStorage, sau đó fetch lại thông tin mới nhất từ server
  useEffect(() => {
    const savedToken = localStorage.getItem('assetflow_token');
    const savedUser = localStorage.getItem('assetflow_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Luôn fetch thông tin mới nhất từ server để cập nhật họ tên, role...
        api.get('/auth/me').then(res => {
          setUser(res.data);
          localStorage.setItem('assetflow_user', JSON.stringify(res.data));
          fetchMyPermissions();
        }).catch(() => {
          // Token hết hạn → xóa session
          localStorage.removeItem('assetflow_token');
          localStorage.removeItem('assetflow_user');
          localStorage.removeItem('assetflow_permissions');
          setToken(null);
          setUser(null);
          setPermissions({});
        });
      } catch {
        localStorage.removeItem('assetflow_token');
        localStorage.removeItem('assetflow_user');
        localStorage.removeItem('assetflow_permissions');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('assetflow_token', newToken);
    localStorage.setItem('assetflow_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    await fetchMyPermissions();
  };

  const logout = () => {
    localStorage.removeItem('assetflow_token');
    localStorage.removeItem('assetflow_user');
    localStorage.removeItem('assetflow_permissions');
    setToken(null);
    setUser(null);
    setPermissions({});
    window.location.href = '/login';
  };

  const isAdmin = () => user?.role === 'Admin';
  const isManager = () => user?.role === 'Admin' || user?.role === 'Manager';
  const hasRole = (roles: UserRole[]) => user ? roles.includes(user.role) : false;

  const canView = (moduleCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = permissions[moduleCode];
    if (!p) {
      if (user.role === 'Manager') return true;
      return moduleCode !== 'settings' && moduleCode !== 'departments';
    }
    return p.view ?? true;
  };

  const canCreate = (moduleCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = permissions[moduleCode];
    if (!p) return user.role === 'Manager';
    return p.create ?? false;
  };

  const canEdit = (moduleCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = permissions[moduleCode];
    if (!p) return user.role === 'Manager';
    return p.edit ?? false;
  };

  const canDelete = (moduleCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = permissions[moduleCode];
    if (!p) return false;
    return p.delete ?? false;
  };

  const canExport = (moduleCode: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const p = permissions[moduleCode];
    if (!p) return user.role === 'Manager';
    return p.export ?? false;
  };

  const clearDefaultPasswordWarning = () => {
    if (user) {
      const updated = { ...user, isDefaultPassword: false };
      setUser(updated);
      localStorage.setItem('assetflow_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      permissions,
      login, 
      logout, 
      isAdmin, 
      isManager, 
      hasRole, 
      canView,
      canCreate,
      canEdit,
      canDelete,
      canExport,
      refreshPermissions,
      clearDefaultPasswordWarning 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
