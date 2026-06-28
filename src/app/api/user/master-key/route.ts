import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const setupSchema = z.object({ masterKeySalt: z.string().length(32) });

/** GET: retrieve the user's stored master key salt (needed to re-derive key on unlock) */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { masterKeySalt: true },
  });

  return NextResponse.json({ masterKeySalt: user?.masterKeySalt ?? null });
}

/** POST: store the master key salt generated client-side during vault setup */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid salt format" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { masterKeySalt: true },
  });

  if (user?.masterKeySalt) {
    return NextResponse.json(
      { error: "Master key salt already set. Cannot overwrite." },
      { status: 409 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { masterKeySalt: parsed.data.masterKeySalt },
  });

  return NextResponse.json({ success: true });
}
