import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { memories } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(memories)
    .where(eq(memories.userId, session.user.id))
    .orderBy(desc(memories.createdAt));
  return NextResponse.json({ memories: rows });
}

const createSchema = z.object({ content: z.string().trim().min(1).max(300) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const [memory] = await db
    .insert(memories)
    .values({ userId: session.user.id, content: parsed.data.content, source: "manual" })
    .returning();
  return NextResponse.json({ memory });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await db
    .delete(memories)
    .where(and(eq(memories.id, parsed.data.id), eq(memories.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}
