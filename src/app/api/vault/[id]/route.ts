import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  username: z.string().min(1).max(200).optional(),
  encryptedSecret: z.string().min(1).optional(),
  iv: z.string().length(24).optional(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.vaultEntry.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vaultEntry.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: "VAULT_ENTRY_DELETED",
      resource: id,
      details: { title: entry.title },
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.vaultEntry.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.vaultEntry.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
