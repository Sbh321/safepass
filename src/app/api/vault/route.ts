import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  username: z.string().min(1).max(200),
  encryptedSecret: z.string().min(1),
  iv: z.string().length(24),
  notes: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.vaultEntry.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      username: true,
      encryptedSecret: true,
      iv: true,
      notes: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const entry = await prisma.vaultEntry.create({
      data: {
        ...parsed.data,
        organizationId: session.user.organizationId,
        userId: session.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "VAULT_ENTRY_CREATED",
        resource: entry.id,
        details: { title: entry.title },
        userId: session.user.id,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[vault POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
