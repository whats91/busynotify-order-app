// =====================================================
// AUTH REPOSITORY - Data Access Layer for Authentication
// =====================================================

import type {
  User,
  AuthCredentials,
  AuthSession,
  CustomerCompanyAccessPayload,
  CustomerCompanyMatch,
  CustomerOtpRequestPayload,
  CustomerOtpVerifyPayload,
} from '../../../shared/types';

export class AuthRepository {
  private sessions: Map<string, AuthSession> = new Map();

  async requestCustomerOtp(payload: CustomerOtpRequestPayload): Promise<{
    success: boolean;
    maskedWhatsappNumber?: string;
    expiresInMinutes?: number;
    companyCount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/auth/request-customer-otp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          maskedWhatsappNumber?: string;
          expiresInMinutes?: number;
          companyCount?: number;
        };
      };

      if (!response.ok || data.success !== true) {
        return {
          success: false,
          error: data.error || 'Failed to send OTP.',
        };
      }

      return {
        success: true,
        maskedWhatsappNumber: data.data?.maskedWhatsappNumber,
        expiresInMinutes: data.data?.expiresInMinutes,
        companyCount: data.data?.companyCount,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send OTP.',
      };
    }
  }

  async validateCustomerCompany(payload: CustomerCompanyAccessPayload): Promise<{
    success: boolean;
    isValid: boolean;
    customerId?: string;
    customerName?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/internal/auth/validate-customer-company', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          isValid?: boolean;
          customerId?: string;
          customerName?: string;
        };
      };

      if (!response.ok || data.success !== true) {
        return {
          success: false,
          isValid: false,
          error: data.error || 'Failed to validate company access.',
        };
      }

      return {
        success: true,
        isValid: data.data?.isValid === true,
        customerId: data.data?.customerId,
        customerName: data.data?.customerName,
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        error: 'Failed to validate company access.',
      };
    }
  }

  async verifyCustomerOtp(payload: CustomerOtpVerifyPayload): Promise<{
    success: boolean;
    companies?: CustomerCompanyMatch[];
    error?: string;
    attemptsLeft?: number;
  }> {
    try {
      const response = await fetch('/api/auth/verify-customer-otp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        attemptsLeft?: number;
        data?: {
          companies?: CustomerCompanyMatch[];
        };
      };

      if (!response.ok || data.success !== true || !Array.isArray(data.data?.companies)) {
        return {
          success: false,
          error: data.error || 'Failed to verify OTP.',
          attemptsLeft: data.attemptsLeft,
        };
      }

      return {
        success: true,
        companies: data.data.companies,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to verify OTP.',
      };
    }
  }

  async completeCustomerLogin(payload: CustomerCompanyAccessPayload): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/auth/complete-customer-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          session?: AuthSession;
        };
      };

      if (!response.ok || data.success !== true || !data.data?.session) {
        return {
          success: false,
          error: data.error || 'Failed to complete login.',
        };
      }

      return {
        success: true,
        session: data.data.session,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to complete login.',
      };
    }
  }

  /**
   * Validate user credentials
   */
  async validateLogin(credentials: AuthCredentials): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/staff-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.status === 401) {
        return null;
      }

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          user?: User;
        };
      };

      if (!response.ok || data.success !== true || !data.data?.user) {
        throw new Error(data.error || 'Failed to validate staff credentials.');
      }

      return data.data.user;
    } catch (error) {
      console.error('Staff credential validation failed:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to validate staff credentials.');
    }
  }

  /**
   * Create a session for the user
   * @future Replace with: Response from POST /api/auth/login
   */
  async createSession(user: User): Promise<AuthSession> {
    await this.simulateDelay();
    
    const session: AuthSession = {
      user,
      token: this.generateMockToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    
    this.sessions.set(session.token, session);
    return session;
  }

  /**
   * Validate an existing session
   * @future Replace with: GET /api/auth/validate
   */
  async validateSession(token: string): Promise<AuthSession | null> {
    await this.simulateDelay();
    
    const session = this.sessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    
    // Clean up expired session
    if (session) {
      this.sessions.delete(token);
    }
    
    return null;
  }

  /**
   * Invalidate a session (logout)
   * @future Replace with: POST /api/auth/logout
   */
  async invalidateSession(token: string): Promise<void> {
    await this.simulateDelay();
    this.sessions.delete(token);
  }

  /**
   * Get user by ID
   * @future Replace with: GET /api/users/:id
   */
  async getUserById(id: string): Promise<User | null> {
    await this.simulateDelay();
    
    const users = [
      { id: 'usr_admin', username: 'admin', name: 'Admin User', role: 'admin' as const },
      { id: 'usr_002', username: 'customer', name: 'Rahul Sharma', role: 'customer' as const },
    ];
    
    const user = users.find(u => u.id === id);
    return user || null;
  }

  // Helper methods
  private generateMockToken(): string {
    return `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async simulateDelay(): Promise<void> {
    // Simulate network delay (100-300ms)
    return new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }
}

// Singleton instance
export const authRepository = new AuthRepository();
