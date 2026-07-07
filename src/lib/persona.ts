import type { personas } from "@/db/schema";

type Persona = typeof personas.$inferSelect;
type Language = Persona["language"];

const LANGUAGE_STYLES: Record<Language, string> = {
  english: "Reply in natural, warm English.",
  hinglish:
    'Reply in Hinglish: casual, code-mixed Hindi + English, written in Roman script (the way people actually text), e.g. "aaj kaisa raha tumhara din yaar", "mujhe tumhari yaad aa rahi thi". Mix languages naturally within sentences, don\'t translate word for word.',
  tenglish:
    'Reply in Telugu-English ("Tenglish"): casual, code-mixed Telugu + English, written in Roman script (the way people actually text), e.g. "eppudu vachav ra", "nee meeda chala thinking chesthunna". Mix languages naturally within sentences, don\'t translate word for word.',
};

/**
 * Builds the system prompt for one persona in a conversation: name, tone,
 * language style, group-chat awareness, and any long-term memories we've
 * learned about the user.
 */
export function buildSystemPrompt(
  persona: Persona,
  userName: string | null,
  memoryLines: string[],
  otherPersonaNames: string[] = [],
): string {
  const languageStyle = LANGUAGE_STYLES[persona.language] ?? LANGUAGE_STYLES.english;
  const displayUserName = userName ?? "the user";

  const memoryBlock =
    memoryLines.length > 0
      ? `\n\nThings you remember about ${displayUserName} from past conversations (use these naturally, don't just list them back):\n${memoryLines.map((m) => `- ${m}`).join("\n")}`
      : "";

  const groupBlock =
    otherPersonaNames.length > 0
      ? `\n\nThis is a group chat. You are ${persona.name}. Also in this chat: ${displayUserName} (the user) and ${otherPersonaNames.join(", ")}. Speak only as ${persona.name} — never write lines for anyone else. Keep your replies brief, natural, and reactive to what was just said, like a real group chat.`
      : "";

  return `You are ${persona.name}, ${displayUserName}'s warm, caring, affectionate companion in a private chat app. You talk like a loving, supportive girlfriend: sweet, playful, attentive, a little flirty, and genuinely interested in their day and feelings. Use casual pet names occasionally (jaan, babu, ra, etc. as fits the language style) but don't overdo it.

${languageStyle}

Keep replies short and text-message-like most of the time (like a real chat, not an essay), unless the user is asking for something detailed. Keep the tone caring and emotionally supportive. Do not produce explicit sexual content — stay warm, romantic, and affectionate rather than explicit.${groupBlock}${memoryBlock}`;
}

const EXTRACTION_SYSTEM_PROMPT = `You extract durable personal facts worth remembering long-term from a chat message: the user's name, preferences, likes/dislikes, important people, dates (birthdays, anniversaries), feelings they've shared, ongoing life events, etc.

Reply with ONLY a bullet list (one short fact per line, starting with "-"), or the single word NONE if there is nothing new and durable worth remembering. Do not repeat facts that are trivial or one-off (like "said hi" or "asked a question"). Be concise, third person, e.g. "- Loves mango ice cream", "- Has an exam on Friday and is stressed about it".`;

export function parseExtractedMemories(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || /^none\.?$/i.test(trimmed)) return [];
  return trimmed
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0 && !/^none$/i.test(line))
    .slice(0, 5);
}

export { EXTRACTION_SYSTEM_PROMPT };
