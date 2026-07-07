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
AI_PROVIDER=groq          # free tier! or: openrouter / openai / anthropic
GROQ_API_KEY=gsk_...      # free key from https://console.groq.com
```

See `.env.example` for all options.

## Use it as a mobile app (PWA)

Saathi is an installable Progressive Web App: opened from a phone it can be
added to the home screen and runs full-screen like a native app. The app
still runs on a server — your phone is the screen; the database, accounts,
and AI calls live wherever the app is hosted. Three ways to set that up:

### Option A (recommended) — no usage caps, works anywhere: your PC + Tailscale

Your PC runs the app and the AI (Ollama); [Tailscale](https://tailscale.com)
(free for personal use) creates a private encrypted network between your own
devices so your phone can reach the app from anywhere — no cloud AI vendor,
no usage caps, conversations never leave your machine.

1. Install Tailscale on your PC and phone (same account on both) —
   [tailscale.com/download](https://tailscale.com/download).
2. On the PC, start the app (`npm run build && npm run start`) and Ollama.
3. Expose the app inside your tailnet with HTTPS:
   `tailscale serve --bg 3000`
   — it prints an address like `https://your-pc.tailXXXX.ts.net`.
4. Open that address on your phone → browser menu → **Add to Home Screen**.
   Because it's HTTPS, the full standalone-app install works.

Only devices signed in to *your* Tailscale account can reach it. The one
tradeoff: the PC has to be on (and running the app) for the app to work.

### Option B — free cloud, works even with your PC off: Vercel + Groq + Turso

1. Push this repo to GitHub and import it at [vercel.com](https://vercel.com)
   (free tier).
2. Create a free SQLite database at [turso.tech](https://turso.tech) and set
   `DATABASE_URL` + `DATABASE_AUTH_TOKEN` in Vercel's env settings.
3. Get a free AI key at [console.groq.com](https://console.groq.com) and set
   `AI_PROVIDER=groq` + `GROQ_API_KEY`. Also set `AUTH_SECRET`.
4. Open the deployed URL on your phone → browser menu → **Add to Home
   Screen** → it installs as the Saathi app.

Note: on Vercel the filesystem is ephemeral, so chat file uploads need object
storage (e.g. Vercel Blob / S3) — image *search* still works out of the box.
Free tiers cap daily usage (Groq: requests/day; Vercel: bandwidth/compute;
Turso: storage) — fine for personal chatting, but they are real limits.

### Option C — simplest, home WiFi only: your PC + local network

Run the app and Ollama on your computer, then on the same WiFi open
`http://<your-pc-ip>:3000` from the phone (start dev with
`npm run dev -- -H 0.0.0.0` so the phone can reach it). Everything stays on
your machine with no accounts or keys. Caveat: browsers only offer the
full-screen **install** experience over HTTPS, so on a plain local address
you'll chat through the browser tab (or a home-screen shortcut) instead of
the installed app.

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
