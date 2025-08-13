/**
 * Environment variable validation for production
 */

// Validate required environment variables
export function validateEnvironment() {
  const requiredEnvVars = ['CURSOR_ADMIN_API_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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



