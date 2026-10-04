import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function serialize(workspace: {
  id: string;
  name: string;
  prompt: string;
  attachments: string;
  pipeline: string;
  evaluation: string;
  mlResult: string;
  approvals: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: workspace.id,
    name: workspace.name,
    prompt: workspace.prompt,
    attachments: JSON.parse(workspace.attachments),
    pipeline: JSON.parse(workspace.pipeline),
    evaluation: JSON.parse(workspace.evaluation),
    mlResult: JSON.parse(workspace.mlResult),
    approvals: JSON.parse(workspace.approvals),
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const workspace = id
    ? await db.workspace.findUnique({ where: { id } })
    : await db.workspace.findFirst({ orderBy: { updatedAt: "desc" } });

  if (!workspace) {
    return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, workspace: serialize(workspace) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    id?: string;
    name?: string;
    prompt?: string;
    attachments?: unknown;
    pipeline?: unknown;
    evaluation?: unknown;
    mlResult?: unknown;
    approvals?: unknown;
  };
  const values = {
    name: body.name || "PromptWall Workspace",
    prompt: body.prompt || "",
    attachments: JSON.stringify(body.attachments || []),
    pipeline: JSON.stringify(body.pipeline || {}),
    evaluation: JSON.stringify(body.evaluation || {}),
    mlResult: JSON.stringify(body.mlResult || {}),
    approvals: JSON.stringify(body.approvals || []),
  };
  const workspace = body.id
    ? await db.workspace.upsert({ where: { id: body.id }, create: values, update: values })
    : await db.workspace.create({ data: values });
  return NextResponse.json({ success: true, workspace: serialize(workspace) });
}
