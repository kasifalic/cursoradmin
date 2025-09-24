/**
 * Environment variable validation for production
 */

// Validate required environment variables
export function validateEnvironment() {
  const requiredEnvVars = ['CURSOR_ADMIN_API_KEY'];
  
  // Special handling for AWS Amplify where env vars exist but aren't enumerable
  const apiKey = process.env.CURSOR_ADMIN_API_KEY;
  
  // Debug logging for AWS Amplify
  console.log('Environment validation:', {
    NODE_ENV: process.env.NODE_ENV,
    CURSOR_ADMIN_API_KEY_EXISTS: !!apiKey,
    CURSOR_ADMIN_API_KEY_LENGTH: apiKey?.length || 0,
    CURSOR_ADMIN_API_KEY_PREVIEW: apiKey?.substring(0, 10) + '...',
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
    DIRECT_ACCESS: !!process.env.CURSOR_ADMIN_API_KEY,
  });
  
  // Check if the API key exists directly (works even if not enumerable)
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(`Missing required environment variables: CURSOR_ADMIN_API_KEY. Direct access: ${!!process.env.CURSOR_ADMIN_API_KEY}`);
  }
  
  console.log('✅ Environment validation passed - API key is available');
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



