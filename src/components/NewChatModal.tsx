"use client";

import { useEffect, useState } from "react";

type Persona = { id: string; name: string; language: "english" | "hinglish" | "tenglish" };

const LANGUAGE_OPTIONS: { value: Persona["language"]; label: string }[] = [
  { value: "hinglish", label: "Hinglish" },
  { value: "tenglish", label: "Tenglish" },
  { value: "english", label: "English" },
];

export function NewChatModal({
  mode,
  onClose,
  onCreated,
}: {
  mode: "single" | "group";
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newLanguage, setNewLanguage] = useState<Persona["language"]>("hinglish");
  const [creatingPersona, setCreatingPersona] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshPersonas() {
    const res = await fetch("/api/personas");
    const data = await res.json();
    setPersonas(data.personas ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch, state is set asynchronously after await
    void refreshPersonas().finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    if (mode === "single") {
      setSelected([id]);
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createPersona() {
    const name = newName.trim();
    if (!name) return;
    setCreatingPersona(true);
    setError(null);
    const res = await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language: newLanguage }),
    });
    const data = await res.json();
    setCreatingPersona(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create companion");
      return;
    }
    setNewName("");
    await refreshPersonas();
    toggle(data.persona.id);
  }

  async function start() {
    if (mode === "single" && selected.length !== 1) return;
    if (mode === "group" && selected.length < 2) return;
    setStarting(true);
    setError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaIds: selected }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start chat");
      return;
    }
    onCreated(data.conversation.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === "single" ? "New chat" : "New group chat"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            ✕
          </button>
        </div>

        {mode === "group" && (
          <p className="mb-3 text-sm text-zinc-500">Pick at least two companions to join.</p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-400">Loading companions...</p>
        ) : (
          <div className="mb-4 max-h-48 overflow-y-auto">
            {personas.length === 0 && (
              <p className="text-sm text-zinc-400">No companions yet — create one below.</p>
            )}
            <ul className="flex flex-col gap-1">
              {personas.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      selected.includes(p.id)
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-500/10"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="text-zinc-800 dark:text-zinc-100">{p.name}</span>
                    <span className="text-xs text-zinc-400">{p.language}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <p className="mb-2 text-xs font-medium text-zinc-500">Create a new companion</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Surekha"
              className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-pink-500 dark:border-zinc-700"
            />
            <select
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value as Persona["language"])}
              className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={createPersona}
              disabled={creatingPersona || !newName.trim()}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add
            </button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={start}
          disabled={
            starting ||
            (mode === "single" && selected.length !== 1) ||
            (mode === "group" && selected.length < 2)
          }
          className="w-full rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50"
        >
          {starting ? "Starting..." : mode === "single" ? "Start chat" : "Start group chat"}
        </button>
      </div>
    </div>
  );
}
