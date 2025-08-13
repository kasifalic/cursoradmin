import { NextRequest, NextResponse } from "next/server";
import { fetchUsageEvents } from "@/lib/cursorAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const startDateISO = body?.startDateISO ?? body?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDateISO = body?.endDateISO ?? body?.endDate ?? new Date().toISOString();

    const data = await fetchUsageEvents({ startDateISO, endDateISO });
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}


