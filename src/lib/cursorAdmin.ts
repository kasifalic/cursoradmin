/*
  Cursor Admin API client utilities. All calls are server-side only.
*/

import { env, validateEnvironment, API_CONFIG } from './env';
import { apiCache, getCacheKey } from './cache';

export type DateRange = {
  startDateISO: string; // inclusive, ISO date string
  endDateISO: string; // inclusive, ISO date string
};

export type UsageMetric = {
  userId: string;
  userEmail: string;
  userName?: string;
  totalRequests?: number;
  acceptedLines?: number;
  totalLines?: number;
  lastActiveAt?: string | null; // ISO datetime
  // Enhanced metrics from daily usage API
  composerRequests?: number;
  chatRequests?: number;
  agentRequests?: number;
  cmdkUsages?: number;
  subscriptionIncludedReqs?: number;
  apiKeyReqs?: number;
  usageBasedReqs?: number;
  bugbotUsages?: number;
  totalLinesAdded?: number;
  totalLinesDeleted?: number;
  acceptedLinesAdded?: number;
  acceptedLinesDeleted?: number;
  totalAccepts?: number;
  totalRejects?: number;
  totalTabsAccepted?: number;
  totalTabsShown?: number;
  mostUsedModel?: string;
  applyMostUsedExtension?: string;
  tabMostUsedExtension?: string;
  activeDays?: number;
  acceptanceRate?: number; // calculated
  productivityScore?: number; // calculated
};

export type DailyUsageResponse = {
  users: UsageMetric[];
};

export type UsageEventsResponse = {
  events: Array<{
    userId: string;
    userEmail: string;
    timestamp: string | number;
    type: string;
    requestCount?: number;
    acceptedLines?: number;
    totalLines?: number;
  }>;
};

function getBaseUrl(): string {
  const envUrl = process.env.CURSOR_ADMIN_BASE_URL?.trim();
  return envUrl && /^https?:\/\//.test(envUrl) ? envUrl.replace(/\/$/, "") : "https://api.cursor.com";
}

function getAuthHeader(): string {
  // Validate environment on first API call
  validateEnvironment();
  const apiKey = env.CURSOR_ADMIN_API_KEY;
  // Basic auth with apiKey as username and empty password
  const basic = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${basic}`;
}

export async function fetchDailyUsage(range: DateRange): Promise<DailyUsageResponse> {
  const base = getBaseUrl();
  const startMs = Date.parse(range.startDateISO);
  const endMs = Date.parse(range.endDateISO);

  const endpoints = [
    `${base}/teams/daily-usage-data`,
    `${base}/teams/usage/daily`,
  ];
  const payloads: any[] = [
    { startDate: startMs, endDate: endMs },
    { startDate: range.startDateISO, endDate: range.endDateISO },
    {},
    { from: range.startDateISO, to: range.endDateISO },
  ];

  let lastErr: any = null;
  for (const url of endpoints) {
    for (const body of payloads) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });
        if (!res.ok) {
          lastErr = new Error(`${url} ${res.status} ${await res.text()}`);
          continue;
        }
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.users)
          ? data.users
          : [];
        const emailToAgg: Record<string, UsageMetric> = {};
        for (const r of rows) {
          const email: string = r?.email ?? r?.userEmail ?? "";
          if (!email) continue;
          const existing = emailToAgg[email] ?? {
            userId: email,
            userEmail: email,
            userName: r?.name ?? r?.userName ?? undefined,
            totalRequests: 0,
            acceptedLines: 0,
            totalLines: 0,
            lastActiveAt: r?.lastActiveAt ?? r?.lastSeenAt ?? null,
            composerRequests: 0,
            chatRequests: 0,
            agentRequests: 0,
            cmdkUsages: 0,
            subscriptionIncludedReqs: 0,
            apiKeyReqs: 0,
            usageBasedReqs: 0,
            bugbotUsages: 0,
            totalLinesAdded: 0,
            totalLinesDeleted: 0,
            acceptedLinesAdded: 0,
            acceptedLinesDeleted: 0,
            totalAccepts: 0,
            totalRejects: 0,
            totalTabsAccepted: 0,
            totalTabsShown: 0,
            activeDays: 0,
          } as UsageMetric;
          
          // Aggregate all request types
          existing.composerRequests = (existing.composerRequests ?? 0) + (r?.composerRequests ?? 0);
          existing.chatRequests = (existing.chatRequests ?? 0) + (r?.chatRequests ?? 0);
          existing.agentRequests = (existing.agentRequests ?? 0) + (r?.agentRequests ?? 0);
          existing.cmdkUsages = (existing.cmdkUsages ?? 0) + (r?.cmdkUsages ?? 0);
          existing.subscriptionIncludedReqs = (existing.subscriptionIncludedReqs ?? 0) + (r?.subscriptionIncludedReqs ?? 0);
          existing.apiKeyReqs = (existing.apiKeyReqs ?? 0) + (r?.apiKeyReqs ?? 0);
          existing.usageBasedReqs = (existing.usageBasedReqs ?? 0) + (r?.usageBasedReqs ?? 0);
          existing.bugbotUsages = (existing.bugbotUsages ?? 0) + (r?.bugbotUsages ?? 0);
          
          // Aggregate productivity metrics
          existing.totalLinesAdded = (existing.totalLinesAdded ?? 0) + (r?.totalLinesAdded ?? 0);
          existing.totalLinesDeleted = (existing.totalLinesDeleted ?? 0) + (r?.totalLinesDeleted ?? 0);
          existing.acceptedLinesAdded = (existing.acceptedLinesAdded ?? 0) + (r?.acceptedLinesAdded ?? 0);
          existing.acceptedLinesDeleted = (existing.acceptedLinesDeleted ?? 0) + (r?.acceptedLinesDeleted ?? 0);
          existing.totalAccepts = (existing.totalAccepts ?? 0) + (r?.totalAccepts ?? 0);
          existing.totalRejects = (existing.totalRejects ?? 0) + (r?.totalRejects ?? 0);
          existing.totalTabsAccepted = (existing.totalTabsAccepted ?? 0) + (r?.totalTabsAccepted ?? 0);
          existing.totalTabsShown = (existing.totalTabsShown ?? 0) + (r?.totalTabsShown ?? 0);
          
          // Track active days
          if (r?.isActive === true || r?.isActive === "true") {
            existing.activeDays = (existing.activeDays ?? 0) + 1;
          }
          
          // Track most used model (take latest non-empty)
          if (r?.mostUsedModel && r.mostUsedModel !== "") {
            existing.mostUsedModel = r.mostUsedModel;
          }
          if (r?.applyMostUsedExtension && r.applyMostUsedExtension !== "") {
            existing.applyMostUsedExtension = r.applyMostUsedExtension;
          }
          if (r?.tabMostUsedExtension && r.tabMostUsedExtension !== "") {
            existing.tabMostUsedExtension = r.tabMostUsedExtension;
          }
          
          const totalRequestsIncrement =
            (r?.chatRequests ?? 0) +
            (r?.composerRequests ?? 0) +
            (r?.agentRequests ?? 0) +
            (r?.subscriptionIncludedReqs ?? 0) +
            (r?.apiKeyReqs ?? 0) +
            (r?.usageBasedReqs ?? 0) +
            (r?.bugbotUsages ?? 0) +
            (r?.requests ?? 0) +
            (r?.requestCount ?? 0) +
            (r?.totalRequests ?? 0);
          existing.totalRequests = (existing.totalRequests ?? 0) + totalRequestsIncrement;
          existing.acceptedLines = (existing.acceptedLines ?? 0) + (r?.acceptedLinesAdded ?? r?.acceptedLines ?? 0);
          existing.totalLines = (existing.totalLines ?? 0) + (r?.totalLinesAdded ?? r?.totalLines ?? 0);
          emailToAgg[email] = existing;
        }
        
        // Calculate derived metrics
        const users: UsageMetric[] = Object.values(emailToAgg).map(user => {
          // Calculate acceptance rate
          const totalShown = user.totalTabsShown ?? 0;
          const totalAccepted = user.totalTabsAccepted ?? 0;
          user.acceptanceRate = totalShown > 0 ? Math.round((totalAccepted / totalShown) * 100) : 0;
          
          // Calculate productivity score (0-100)
          const linesAdded = user.totalLinesAdded ?? 0;
          const linesAccepted = user.acceptedLinesAdded ?? 0;
          const requests = user.totalRequests ?? 0;
          const activeDays = user.activeDays ?? 0;
          
          let productivityScore = 0;
          if (requests > 0) {
            productivityScore = Math.min(100, Math.round(
              (linesAccepted * 0.01) +  // 40% weight on accepted lines (scaled down)
              (user.acceptanceRate! * 0.3) +  // 30% weight on acceptance rate
              (Math.min(activeDays * 5, 30))  // 30% weight on active days (max 30)
            ));
          }
          user.productivityScore = productivityScore;
          
          return user;
        });
        return { users };
      } catch (e: any) {
        lastErr = e;
        continue;
      }
    }
  }
  throw new Error(`Cursor daily usage failed: ${lastErr?.message ?? lastErr}`);
}

export async function fetchUsageEvents(range: DateRange): Promise<UsageEventsResponse> {
  const base = getBaseUrl();
  const startMs = Date.parse(range.startDateISO);
  const endMs = Date.parse(range.endDateISO);
  const endpoints = [
    `${base}/teams/filtered-usage-events`,
    `${base}/teams/usage/events`,
  ];
  const payloads: any[] = [
    { startDate: startMs, endDate: endMs },
    { startDate: range.startDateISO, endDate: range.endDateISO },
    {},
    { from: range.startDateISO, to: range.endDateISO },
  ];
  let lastErr: any = null;
  for (const url of endpoints) {
    for (const body of payloads) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });
        if (!res.ok) {
          lastErr = new Error(`${url} ${res.status} ${await res.text()}`);
          continue;
        }
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.usageEvents)
          ? data.usageEvents
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.events)
          ? data.events
          : [];
        return {
          events: rows.map((e: any) => ({
            userId: e.userId ?? e.id ?? e.userEmail ?? "",
            userEmail: e.userEmail ?? e.email ?? "",
            timestamp: e.timestamp ?? e.time ?? e.createdAt ?? null,
            type: e.type ?? e.eventType ?? e.kindLabel ?? "usage",
            requestCount: e.requestCount ?? e.requests ?? undefined,
            acceptedLines: e.acceptedLines ?? undefined,
            totalLines: e.totalLines ?? undefined,
          })),
        };
      } catch (e: any) {
        lastErr = e;
        continue;
      }
    }
  }
  throw new Error(`Cursor usage events failed: ${lastErr?.message ?? lastErr}`);
}

export function computeAggregates(users: UsageMetric[]) {
  const byActivity = [...users].sort((a, b) => (b.totalRequests ?? 0) - (a.totalRequests ?? 0));
  const top25 = byActivity.slice(0, 25);
  const last25 = byActivity.slice(-25);
  return { top25, last25 };
}

export function filterInactive(users: UsageMetric[], days: number): UsageMetric[] {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return users.filter((u) => {
    if (!u.lastActiveAt) return true;
    const t = Number(u.lastActiveAt) || Date.parse(u.lastActiveAt);
    if (Number.isNaN(t)) return true;
    return t < cutoff;
  });
}

export type TeamMember = { email: string; name?: string; role?: string };

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const cacheKey = getCacheKey('team-members', {});
  const cached = apiCache.get<TeamMember[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetch(`${getBaseUrl()}/teams/members`, {
    method: "GET",
    headers: { Authorization: getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor team members failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const members: TeamMember[] = (data?.teamMembers ?? data?.members ?? data ?? []).map((m: any) => ({
    email: m?.email ?? "",
    name: m?.name ?? m?.fullName ?? undefined,
    role: m?.role ?? undefined,
  }));
  
  // Cache for 15 minutes since team members don't change frequently
  apiCache.set(cacheKey, members, 15 * 60 * 1000);
  return members;
}


