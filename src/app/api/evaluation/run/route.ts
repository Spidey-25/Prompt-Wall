import { NextResponse } from "next/server";

export async function POST() {
  const pythonUrl = process.env.PYTHON_ENGINE_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${pythonUrl}/evaluation/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 5 min timeout for evaluation run
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Python engine status ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to communicate with Python engine",
      },
      { status: 502 }
    );
  }
}
