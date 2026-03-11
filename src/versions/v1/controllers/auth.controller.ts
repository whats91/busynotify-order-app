// =====================================================
// AUTH CONTROLLER - Request/Response Handling for Auth
// This would be used by API routes in a real backend
// =====================================================

import type { AuthCredentials, ApiResponse, AuthSession } from '../../../shared/types';
import { authService } from '../services/auth.service';

export class AuthController {
  /**
   * Handle login request
   * @future This will be called by POST /api/auth/login
   */
  async login(credentials: AuthCredentials): Promise<ApiResponse<{ session: AuthSession }>> {
    const result = await authService.login(credentials);
    
    if (result.success && result.session) {
      return {
        success: true,
        data: { session: result.session },
        message: 'Login successful',
      };
    }
    
    return {
      success: false,
      error: result.error || 'Login failed',
    };
  }

  /**
   * Handle logout request
   * @future This will be called by POST /api/auth/logout
   */
  async logout(token: string): Promise<ApiResponse<null>> {
    await authService.logout(token);
    
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  /**
   * Validate session
   * @future This will be called by GET /api/auth/validate
   */
  async validateSession(token: string): Promise<ApiResponse<{ session: AuthSession }>> {
    const session = await authService.validateSession(token);
    
    if (session) {
      return {
        success: true,
        data: { session },
      };
    }
    
    return {
      success: false,
      error: 'Invalid or expired session',
    };
  }
}

// Singleton instance
export const authController = new AuthController();
