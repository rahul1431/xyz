"use client";

import { useEffect, useState } from "react";

type Language = "english" | "hinglish" | "tenglish";
type Persona = { id: string; name: string; language: Language };
type Memory = { id: string; content: string; source: "auto" | "manual"; createdAt: string };

const LANGUAGE_OPTIONS: { value: Language; label: string; hint: string }[] = [
  { value: "hinglish", label: "Hinglish", hint: "Hindi + English mixed" },
  { value: "tenglish", label: "Tenglish", hint: "Telugu + English mixed" },
  { value: "english", label: "English", hint: "Plain English" },
];

export default function SettingsPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(true);
  const [newName, setNewName] = useState("");
  const [newLanguage, setNewLanguage] = useState<Language>("hinglish");
  const [creating, setCreating] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [loadingMemories, setLoadingMemories] = useState(true);

  useEffect(() => {
    loadPersonas();
    loadMemories();
  }, []);

  async function loadPersonas() {
    setLoadingPersonas(true);
    const res = await fetch("/api/personas");
    const data = await res.json();
    setPersonas(data.personas ?? []);
    setLoadingPersonas(false);
  }

  async function loadMemories() {
    setLoadingMemories(true);
    const res = await fetch("/api/memories");
    const data = await res.json();
    setMemories(data.memories ?? []);
    setLoadingMemories(false);
  }

  async function createPersona() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language: newLanguage }),
    });
    setNewName("");
    setCreating(false);
    await loadPersonas();
  }

  async function deletePersona(id: string) {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/personas/${id}`, { method: "DELETE" });
  }

  async function addMemory() {
    const content = newMemory.trim();
    if (!content) return;
    setNewMemory("");
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    await loadMemories();
  }

  async function deleteMemory(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await fetch("/api/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Settings
      </h1>

      <section className="mb-10 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Your companions
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Create as many as you like — give each one a name and language
          style, then start a chat (or a group chat) with them.
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPersona()}
            placeholder="e.g. Surekha"
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700"
          />
          <select
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value as Language)}
            className="rounded-lg border border-zinc-300 bg-transparent px-2 py-2 text-sm dark:border-zinc-700"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={createPersona}
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-60"
          >
            Add
          </button>
        </div>

        {loadingPersonas && <p className="text-sm text-zinc-400">Loading...</p>}
        {!loadingPersonas && personas.length === 0 && (
          <p className="text-sm text-zinc-400">No companions yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {personas.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {p.name} <span className="text-xs text-zinc-400">— {p.language}</span>
              </span>
              <button
                onClick={() => deletePersona(p.id)}
                className="ml-2 shrink-0 text-zinc-400 hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          What they remember about you
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Learned automatically from your chats, or add your own. These carry
          across every conversation and every companion.
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMemory()}
            placeholder="e.g. My birthday is March 4th"
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700"
          />
          <button
            onClick={addMemory}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Add
          </button>
        </div>

        {loadingMemories && <p className="text-sm text-zinc-400">Loading...</p>}
        {!loadingMemories && memories.length === 0 && (
          <p className="text-sm text-zinc-400">Nothing remembered yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {memories.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
            >
              <span className="text-zinc-700 dark:text-zinc-300">{m.content}</span>
              <button
                onClick={() => deleteMemory(m.id)}
                className="ml-2 shrink-0 text-zinc-400 hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
