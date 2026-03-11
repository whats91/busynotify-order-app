// =====================================================
// RUNTIME ENVIRONMENT CONFIGURATION
// =====================================================
// This module provides access to environment variables at runtime.
// Next.js only exposes NEXT_PUBLIC_ prefixed variables to the client,
// but this module ensures all configured variables are available server-side.

// Server-side environment variables
export const serverEnv = {
  // Application
  appName: process.env.APP_NAME || 'busy-notify',
  appPort: parseInt(process.env.APP_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Add more environment variables as needed
};

// Client-side environment variables (must be prefixed with NEXT_PUBLIC_)
export const clientEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'busy-notify',
};

// Type exports
export type ServerEnv = typeof serverEnv;
export type ClientEnv = typeof clientEnv;

// Helper to check if running on server
export const isServer = typeof window === 'undefined';

// Helper to check if running in production
export const isProduction = process.env.NODE_ENV === 'production';

// Helper to check if running in development
export const isDevelopment = process.env.NODE_ENV === 'development';
