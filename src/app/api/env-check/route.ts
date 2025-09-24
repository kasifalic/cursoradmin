import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.CURSOR_ADMIN_API_KEY;
  
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    CURSOR_ADMIN_API_KEY_EXISTS: !!apiKey,
    CURSOR_ADMIN_API_KEY_LENGTH: apiKey?.length || 0,
    CURSOR_ADMIN_API_KEY_PREVIEW: apiKey?.substring(0, 10) + '...',
    CURSOR_ADMIN_API_KEY_VALID: !!(apiKey && apiKey.trim() !== ''),
    ALL_CURSOR_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
    TOTAL_ENV_VARS: Object.keys(process.env).length,
    DIRECT_ACCESS_TEST: !!process.env.CURSOR_ADMIN_API_KEY,
    ENV_KEYS_SAMPLE: Object.keys(process.env).slice(0, 10),
    TIMESTAMP: new Date().toISOString(),
  });
}
