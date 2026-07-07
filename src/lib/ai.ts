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
  } else if (provider in OPENAI_COMPATIBLE) {
    yield* streamOpenAICompatible(provider, history, systemPrompt);
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

// --- OpenAI-compatible APIs (OpenAI, plus Groq/OpenRouter free tiers) ---
const OPENAI_COMPATIBLE: Record<
  string,
  { baseUrl: string; keyEnv: string; modelEnv: string; defaultModel: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  },
};

async function* streamOpenAICompatible(
  provider: string,
  history: ChatMessage[],
  systemPrompt: string,
): AsyncGenerator<string> {
  const cfg = OPENAI_COMPATIBLE[provider];
  const apiKey = process.env[cfg.keyEnv];
  if (!apiKey) throw new Error(`${cfg.keyEnv} is not set`);
  const model = process.env[cfg.modelEnv] ?? cfg.defaultModel;
  const baseUrl = process.env.OPENAI_BASE_URL ?? cfg.baseUrl;

  const res = await fetch(`${baseUrl}/chat/completions`, {
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
    throw new Error(`${provider} request failed (${res.status}): ${text}`);
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
