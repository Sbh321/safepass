import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const acceptSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(12),
});

/** GET: validate the invitation token and return invitation metadata */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  if (invitation.acceptedAt) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    invitedBy: invitation.invitedBy.name ?? invitation.invitedBy.email,
  });
}

/** POST: accept the invitation — create the user account */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.teamInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.acceptedAt || new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx: TxClient) => {
    await tx.user.create({
      data: {
        name: parsed.data.name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    });

    await tx.teamInvitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
