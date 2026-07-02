# Saathi — a personal AI chat companion

A private, self-hosted chat app: create one or more AI companions, chat with
them 1:1 or bring several into a group chat together, in English, Hinglish
(Hindi + English) or Tenglish (Telugu + English). Companions remember things
about you across every conversation via a long-term memory store.

## Features

- Email/password auth, each user's chats are private to them
- Create multiple named companions (e.g. "Surekha", "Sunitha"), each with
  its own language style
- 1:1 chats and group chats (you + 2+ companions, who react to each other)
- Streaming responses
- Long-term memory: facts the AI learns about you are extracted
  automatically and reused in every future chat; view/add/remove them under
  Settings
- Share images in chat: upload your own, or search openly-licensed images
  (via [Openverse](https://openverse.org), safe-content filtered — no
  scraping of arbitrary sites)
- Pluggable AI backend: local/open-source model via [Ollama](https://ollama.com)
  by default (no API key, runs entirely on your machine), or swap to
  OpenAI/Anthropic via one env var

## Setup

```bash
npm install
cp .env.example .env
# generate a session secret and put it in .env as AUTH_SECRET
npx auth secret

npm run db:push   # creates the local SQLite database
npm run dev
```

Open http://localhost:3000, register an account, and create your first
companion.

### AI provider

By default the app talks to a local model via [Ollama](https://ollama.com):

```bash
# install Ollama, then:
ollama pull llama3.2
ollama serve
```

To use a cloud provider instead, set in `.env`:

```
AI_PROVIDER=openai        # or anthropic
OPENAI_API_KEY=sk-...
```

See `.env.example` for all options.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Drizzle ORM + SQLite (via libSQL) — zero external services needed
- NextAuth (credentials + JWT sessions)
- Provider-agnostic streaming AI layer (`src/lib/ai.ts`)

## Notes

- Uploaded files are stored under `public/uploads/<userId>/` on local disk —
  fine for local/self-hosted use; swap for object storage (S3, etc.) if you
  deploy to a platform with an ephemeral filesystem.
- Companions are designed to be warm and affectionate, not explicit —
  the system prompt (`src/lib/persona.ts`) explicitly steers away from
  sexual content.
