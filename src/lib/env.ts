/**
 * Environment variable validation for production
 */

// Validate required environment variables
export function validateEnvironment() {
  const requiredEnvVars = ['CURSOR_ADMIN_API_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  // Debug logging for AWS Amplify
  console.log('Environment validation:', {
    NODE_ENV: process.env.NODE_ENV,
    CURSOR_ADMIN_API_KEY_EXISTS: !!process.env.CURSOR_ADMIN_API_KEY,
    CURSOR_ADMIN_API_KEY_LENGTH: process.env.CURSOR_ADMIN_API_KEY?.length || 0,
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Available CURSOR env vars: ${Object.keys(process.env).filter(key => key.includes('CURSOR')).join(', ')}`);
  }
}

// Type-safe environment access
export const env = {
  CURSOR_ADMIN_API_KEY: process.env.CURSOR_ADMIN_API_KEY!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL_URL: process.env.VERCEL_URL,
} as const;

// Runtime environment checks
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

// API configuration
export const API_CONFIG = {
  baseURL: 'https://api.cursor.com',
  timeout: 30000, // 30 seconds
  retries: 3,
} as const;



