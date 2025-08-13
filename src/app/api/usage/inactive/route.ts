import { NextRequest, NextResponse } from "next/server";
import { fetchDailyUsage, fetchTeamMembers } from "@/lib/cursorAdmin";

// Returns users inactive for the given number of days, with lastActiveAt computed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const days = daysParam === "30" ? 30 : 15;

    // Optimize: Only fetch data needed for inactive calculation 
    const now = Date.now();
    const dataRangeMs = Math.max(days * 2, 60) * 24 * 60 * 60 * 1000; // 2x the inactive period or 60 days minimum for 30-day lookback
    const startMs = now - dataRangeMs;
    const endMs = now;

    // Single optimized API call instead of multiple calls
    const res = await fetch("https://api.cursor.com/teams/daily-usage-data", {
      method: "POST",
      headers: {
        Authorization: (() => {
          const apiKey = process.env.CURSOR_ADMIN_API_KEY;
          if (!apiKey) throw new Error("Missing CURSOR_ADMIN_API_KEY env var");
          const basic = Buffer.from(`${apiKey}:`).toString("base64");
          return `Basic ${basic}`;
        })(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ startDate: startMs, endDate: endMs }),
      cache: "no-store",
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cursor daily rows failed: ${res.status} ${text}`);
    }
    
    const raw = await res.json();
    const rows: any[] = Array.isArray(raw?.data) ? raw.data : [];

    // Fetch team members in parallel
    const membersPromise = fetchTeamMembers().catch(() => []);

    // Process raw data more efficiently
    const emailToLast: Record<string, number> = {};
    const emailToTotals: Record<string, any> = {};
    
    for (const r of rows) {
      const email: string = r?.email ?? r?.userEmail ?? "";
      if (!email) continue;
      
      // Track last active date
      const active = Boolean(r?.isActive) ||
        (r?.composerRequests ?? 0) > 0 ||
        (r?.chatRequests ?? 0) > 0 ||
        (r?.agentRequests ?? 0) > 0 ||
        (r?.cmdkUsages ?? 0) > 0 ||
        (r?.subscriptionIncludedReqs ?? 0) > 0 ||
        (r?.apiKeyReqs ?? 0) > 0 ||
        (r?.usageBasedReqs ?? 0) > 0 ||
        (r?.bugbotUsages ?? 0) > 0 ||
        (r?.acceptedLinesAdded ?? 0) > 0 ||
        (r?.totalLinesAdded ?? 0) > 0 ||
        (r?.totalTabsShown ?? 0) > 0;
        
      if (active) {
        const dateMs = Number(r?.date);
        if (Number.isFinite(dateMs)) {
          const prev = emailToLast[email] ?? 0;
          if (dateMs > prev) emailToLast[email] = dateMs;
        }
      }
      
      // Aggregate totals while we're processing
      if (!emailToTotals[email]) {
        emailToTotals[email] = {
          userId: r?.userId ?? "",
          userEmail: email,
          totalRequests: 0,
          composerRequests: 0,
          chatRequests: 0,
          agentRequests: 0,
          activeDays: 0
        };
      }
      
      const user = emailToTotals[email];
      user.totalRequests += (r?.composerRequests ?? 0) + (r?.chatRequests ?? 0) + (r?.agentRequests ?? 0);
      user.composerRequests += r?.composerRequests ?? 0;
      user.chatRequests += r?.chatRequests ?? 0; 
      user.agentRequests += r?.agentRequests ?? 0;
      if (active) user.activeDays += 1;
    }

    const cutoff = now - days * 24 * 60 * 60 * 1000;
    
    // Get team members
    const members = await membersPromise;
    const emailToName = Object.fromEntries((members as any[]).filter(Boolean).map((m: any) => [m.email, m.name]));

    // Build final user list from aggregated data
    const users = Object.values(emailToTotals)
      .map((u: any) => {
        const ts = emailToLast[u.userEmail];
        const withLast = { ...u, lastActiveAt: ts ? new Date(ts).toISOString() : null };
        const name = withLast.userName ?? emailToName[withLast.userEmail];
        return name ? { ...withLast, userName: name } : withLast;
      })
      .filter((u) => {
        if (!u.lastActiveAt) return true; // no activity -> inactive
        const t = Date.parse(u.lastActiveAt);
        if (!Number.isFinite(t)) return true;
        return t < cutoff;
      });

    return NextResponse.json({ users }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}


