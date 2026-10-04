import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:5000";

  try {
    const response = await fetch(`${backendUrl}/api/audit`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Audit service is unavailable." },
      { status: 502 }
    );
  }
}
