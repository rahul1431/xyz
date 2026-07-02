import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { personas } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(personas)
    .where(eq(personas.userId, session.user.id))
    .orderBy(desc(personas.createdAt));
  return NextResponse.json({ personas: rows });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  language: z.enum(["english", "hinglish", "tenglish"]).default("hinglish"),
});

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
  const [persona] = await db
    .insert(personas)
    .values({ userId: session.user.id, ...parsed.data })
    .returning();
  return NextResponse.json({ persona });
}
