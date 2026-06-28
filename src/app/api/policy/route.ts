import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const policySchema = z.object({
  minLength: z.number().int().min(8).max(128),
  maxLength: z.number().int().min(12).max(256),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSymbols: z.boolean(),
  banSimilarWords: z.boolean(),
  bannedWords: z.array(z.string().max(50)).max(100),
  minEntropyBits: z.number().min(0).max(256),
  passwordExpiry: z.number().int().min(1).max(365).nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const policy = await prisma.passwordPolicy.findUnique({
    where: { organizationId: session.user.organizationId },
  });

  return NextResponse.json(policy ?? null);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = policySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const policy = await prisma.passwordPolicy.upsert({
    where: { organizationId: session.user.organizationId },
    create: { ...parsed.data, organizationId: session.user.organizationId },
    update: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      action: "POLICY_UPDATED",
      resource: policy.id,
      details: parsed.data,
      userId: session.user.id,
    },
  });

  return NextResponse.json(policy);
}
