import { db } from "@/db";
import { memories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getChatCompletion,
  type ChatMessage,
} from "@/lib/ai";
import { EXTRACTION_SYSTEM_PROMPT, parseExtractedMemories } from "@/lib/persona";

const MAX_MEMORIES_IN_PROMPT = 30;

export async function getRecentMemoryLines(userId: string): Promise<string[]> {
  const rows = await db
    .select({ content: memories.content })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
    .limit(MAX_MEMORIES_IN_PROMPT);
  return rows.map((r) => r.content).reverse();
}

/**
 * Fire-and-forget: asks the AI to pull out any durable new facts from the
 * latest exchange and saves them, so the companion "remembers" things across
 * every future conversation, not just the current thread.
 */
export function captureMemoriesInBackground(
  userId: string,
  userMessage: string,
  assistantMessage: string,
) {
  void extractAndSaveMemories(userId, userMessage, assistantMessage).catch(
    (err) => {
      console.error("Memory extraction failed:", err);
    },
  );
}

async function extractAndSaveMemories(
  userId: string,
  userMessage: string,
  assistantMessage: string,
) {
  const history: ChatMessage[] = [
    {
      role: "user",
      content: `User said: "${userMessage}"\nCompanion replied: "${assistantMessage}"`,
    },
  ];

  const raw = await getChatCompletion(history, EXTRACTION_SYSTEM_PROMPT);
  const facts = parseExtractedMemories(raw);
  if (facts.length === 0) return;

  await db
    .insert(memories)
    .values(facts.map((content) => ({ userId, content, source: "auto" as const })));
}
