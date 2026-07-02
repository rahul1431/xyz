import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { conversationPersonas, conversations, messages, personas } from "@/db/schema";
import { ChatWindow } from "@/components/ChatWindow";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .limit(1);
  if (!conversation) notFound();

  const [initialMessages, members] = await Promise.all([
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

  const personaNameById = new Map(members.map((p) => [p.id, p.name]));

  return (
    <ChatWindow
      key={id}
      conversationId={id}
      isGroup={conversation.isGroup}
      companions={members}
      initialMessages={initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        personaId: m.personaId,
        personaName: m.personaId ? personaNameById.get(m.personaId) : undefined,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        attachmentName: m.attachmentName,
      }))}
    />
  );
}
