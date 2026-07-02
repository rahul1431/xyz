export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful, knowledgeable AI assistant in a chat app. Answer clearly and concisely, and use Markdown formatting when useful.";

/**
 * Streams a chat completion as an async iterable of text chunks.
 * Provider is selected via AI_PROVIDER so the app isn't locked to one vendor.
 */
export async function* streamChatCompletion(
  history: ChatMessage[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
): AsyncGenerator<string> {
  const provider = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

  if (provider === "ollama") {
    yield* streamOllama(history, systemPrompt);
  } else if (provider === "openai") {
    yield* streamOpenAI(history, systemPrompt);
  } else if (provider === "anthropic") {
    yield* streamAnthropic(history, systemPrompt);
  } else {
    throw new Error(`Unknown AI_PROVIDER "${provider}"`);
  }
}

/** Non-streaming helper: collects a full completion (used for memory extraction). */
export async function getChatCompletion(
  history: ChatMessage[],
  systemPrompt: string = DEFAULT_SYSTEM_PROMPT,
): Promise<string> {
  let out = "";
  for await (const chunk of streamChatCompletion(history, systemPrompt)) {
    out += chunk;
  }
  return out;
}

// --- Ollama (local, open-source models, no API key) ---
async function* streamOllama(
  history: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        stream: true,
      }),
    });
  } catch {
    throw new Error(
      `Could not reach Ollama at ${baseUrl}. Install it from https://ollama.com, run "ollama pull ${model}", and make sure "ollama serve" is running.`,
    );
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama request failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      if (json.message?.content) yield json.message.content as string;
      if (json.done) return;
    }
  }
}

// --- OpenAI (optional, requires OPENAI_API_KEY) ---
async function* streamOpenAI(
  history: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...history],
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${text}`);
  }

  yield* readSseDeltas(res.body, (json) => {
    const obj = json as { choices?: { delta?: { content?: string } }[] };
    return obj.choices?.[0]?.delta?.content;
  });
}

// --- Anthropic (optional, requires ANTHROPIC_API_KEY) ---
async function* streamAnthropic(
  history: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: 4096,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic request failed (${res.status}): ${text}`);
  }

  yield* readSseDeltas(res.body, (json) => {
    const obj = json as { type?: string; delta?: { text?: string } };
    return obj.type === "content_block_delta" ? obj.delta?.text : undefined;
  });
}

// Shared SSE ("data: {...}") stream parser for OpenAI/Anthropic-style APIs.
async function* readSseDeltas(
  body: ReadableStream<Uint8Array>,
  extractText: (json: Record<string, unknown>) => string | undefined,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const text = extractText(json);
        if (text) yield text;
      } catch {
        // ignore keep-alive / malformed lines
      }
    }
  }
}
