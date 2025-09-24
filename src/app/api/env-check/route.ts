import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    CURSOR_ADMIN_API_KEY_EXISTS: !!process.env.CURSOR_ADMIN_API_KEY,
    CURSOR_ADMIN_API_KEY_LENGTH: process.env.CURSOR_ADMIN_API_KEY?.length || 0,
    CURSOR_ADMIN_API_KEY_PREVIEW: process.env.CURSOR_ADMIN_API_KEY?.substring(0, 10) + '...',
    ALL_CURSOR_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
    TOTAL_ENV_VARS: Object.keys(process.env).length,
    TIMESTAMP: new Date().toISOString(),
  });
}
