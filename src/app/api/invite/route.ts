import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Prevent MANAGER from creating MANAGER invitations
  if (session.user.role === "MANAGER" && parsed.data.role === "MANAGER") {
    return NextResponse.json({ error: "Managers can only invite employees" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  const invitation = await prisma.teamInvitation.create({
    data: {
      email: parsed.data.email,
      role: parsed.data.role,
      organizationId: session.user.organizationId,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

  return NextResponse.json({ token: invitation.token, inviteUrl }, { status: 201 });
}
