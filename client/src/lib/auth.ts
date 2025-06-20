import { apiRequest } from './queryClient';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'clinician' | 'researcher' | 'admin';
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

class AuthService {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    // Load from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch (e) {
        this.clearAuth();
      }
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('Attempting login with credentials:', { username: credentials.username });
    
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    const data: AuthResponse = await response.json();
    
    console.log('Login successful:', data);
    this.setAuth(data.token, data.user);
    return data;
  }

  logout() {
    this.clearAuth();
    window.location.href = '/clinical/login';
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  hasRole(roles: string[]): boolean {
    return this.user ? roles.includes(this.user.role) : false;
  }

  private setAuth(token: string, user: AuthUser) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  // Add token to requests automatically
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }
}

export const authService = new AuthService();

// Custom hook for React components
export function useAuth() {
  return {
    user: authService.getUser(),
    isAuthenticated: authService.isAuthenticated(),
    hasRole: (roles: string[]) => authService.hasRole(roles),
    login: (credentials: LoginRequest) => authService.login(credentials),
    logout: () => authService.logout(),
  };
}