import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc, inArray, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversations, conversationPersonas, personas } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt));

  const convoIds = convos.map((c) => c.id);
  const members =
    convoIds.length > 0
      ? await db
          .select({
            conversationId: conversationPersonas.conversationId,
            personaId: personas.id,
            personaName: personas.name,
          })
          .from(conversationPersonas)
          .innerJoin(personas, eq(conversationPersonas.personaId, personas.id))
          .where(inArray(conversationPersonas.conversationId, convoIds))
      : [];

  const membersByConvo = new Map<string, { id: string; name: string }[]>();
  for (const m of members) {
    const list = membersByConvo.get(m.conversationId) ?? [];
    list.push({ id: m.personaId, name: m.personaName });
    membersByConvo.set(m.conversationId, list);
  }

  return NextResponse.json({
    conversations: convos.map((c) => ({
      ...c,
      personas: membersByConvo.get(c.id) ?? [],
    })),
  });
}

const createSchema = z.object({
  personaIds: z.array(z.string().min(1)).min(1),
  title: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { personaIds, title } = parsed.data;

  const ownedPersonas = await db
    .select()
    .from(personas)
    .where(
      and(eq(personas.userId, session.user.id), inArray(personas.id, personaIds)),
    );
  if (ownedPersonas.length !== personaIds.length) {
    return NextResponse.json({ error: "Unknown persona" }, { status: 400 });
  }

  const isGroup = personaIds.length > 1;
  const defaultTitle = isGroup
    ? ownedPersonas.map((p) => p.name).join(", ")
    : ownedPersonas[0].name;

  const [conversation] = await db
    .insert(conversations)
    .values({
      userId: session.user.id,
      title: title ?? defaultTitle,
      isGroup,
    })
    .returning();

  await db
    .insert(conversationPersonas)
    .values(personaIds.map((personaId) => ({ conversationId: conversation.id, personaId })));

  return NextResponse.json({ conversation });
}
