import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, conversationPersonas, messages, personas } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

async function requireOwnedConversation(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
    )
    .limit(1);
  return conversation;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const conversation = await requireOwnedConversation(session.user.id, id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [rows, members] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt)),
    db
      .select({ id: personas.id, name: personas.name })
      .from(conversationPersonas)
      .innerJoin(personas, eq(conversationPersonas.personaId, personas.id))
      .where(eq(conversationPersonas.conversationId, id)),
  ]);

  return NextResponse.json({
    conversation: { ...conversation, personas: members },
    messages: rows,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const conversation = await requireOwnedConversation(session.user.id, id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ ok: true });
}
