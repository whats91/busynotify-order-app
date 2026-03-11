// =====================================================
// AUTH SERVICE - Business Logic for Authentication
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
import { authRepository } from '../repositories/auth.repository';

export class AuthService {
  /**
   * Login user with credentials
   * Returns session on success, null on failure
   */
  async login(credentials: AuthCredentials): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    try {
      // Validate credentials
      const user = await authRepository.validateLogin(credentials);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      }
      
      // Create session
      const session = await authRepository.createSession(user);
      
      return {
        success: true,
        session,
      };
    } catch (error) {
      return {
        success: false,
        error: 'An error occurred during login',
      };
    }
  }

  /**
   * Validate existing session
   */
  async validateSession(token: string): Promise<AuthSession | null> {
    return authRepository.validateSession(token);
  }

  async requestCustomerOtp(payload: CustomerOtpRequestPayload): Promise<{
    success: boolean;
    maskedWhatsappNumber?: string;
    expiresInMinutes?: number;
    companyCount?: number;
    error?: string;
  }> {
    return authRepository.requestCustomerOtp(payload);
  }

  async validateCustomerCompany(payload: CustomerCompanyAccessPayload): Promise<{
    success: boolean;
    isValid: boolean;
    customerId?: string;
    customerName?: string;
    error?: string;
  }> {
    return authRepository.validateCustomerCompany(payload);
  }

  async verifyCustomerOtp(payload: CustomerOtpVerifyPayload): Promise<{
    success: boolean;
    companies?: CustomerCompanyMatch[];
    error?: string;
    attemptsLeft?: number;
  }> {
    return authRepository.verifyCustomerOtp(payload);
  }

  async completeCustomerLogin(payload: CustomerCompanyAccessPayload): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    return authRepository.completeCustomerLogin(payload);
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(token: string): Promise<void> {
    await authRepository.invalidateSession(token);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return authRepository.getUserById(id);
  }
}

// Singleton instance
export const authService = new AuthService();
