import { NextRequest, NextResponse } from "next/server";
import { fetchDailyUsage, fetchUsageEvents, fetchTeamMembers } from "@/lib/cursorAdmin";

export async function POST(req: NextRequest) {
  try {
    // Debug: Log environment variables for troubleshooting
    console.log('API Route - Environment Debug:', {
      NODE_ENV: process.env.NODE_ENV,
      CURSOR_ADMIN_API_KEY_EXISTS: !!process.env.CURSOR_ADMIN_API_KEY,
      CURSOR_ADMIN_API_KEY_LENGTH: process.env.CURSOR_ADMIN_API_KEY?.length || 0,
      ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
    });

    const body = await req.json().catch(() => ({} as any));
    const startDateISO = body?.startDateISO ?? body?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDateISO = body?.endDateISO ?? body?.endDate ?? new Date().toISOString();

    // Optimize: Reduce API calls for better performance
    const [daily, members] = await Promise.all([
      fetchDailyUsage({ startDateISO, endDateISO }),
      fetchTeamMembers().catch(() => []),
    ]);
    
    // Skip events API call for now to improve performance - daily usage data should be sufficient
    // If lastActiveAt is critical, we can add it back with caching
    
    const emailToName = Object.fromEntries((members as any[]).filter(Boolean).map((m: any) => [m.email, m.name]));
    const users = daily.users.map((u) => {
      const name = u.userName ?? emailToName[u.userEmail];
      return name ? { ...u, userName: name } : u;
    });
    
    return NextResponse.json({ users }, { status: 200 });
  } catch (err: any) {
    console.error('API Route Error:', err);
    return NextResponse.json({ 
      error: err?.message ?? "Unknown error",
      debug: {
        NODE_ENV: process.env.NODE_ENV,
        CURSOR_ADMIN_API_KEY_EXISTS: !!process.env.CURSOR_ADMIN_API_KEY,
        ENV_KEYS: Object.keys(process.env).filter(key => key.includes('CURSOR')),
      }
    }, { status: 500 });
  }
}


