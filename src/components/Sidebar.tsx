"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { NewChatModal } from "@/components/NewChatModal";

type Conversation = {
  id: string;
  title: string;
  isGroup: boolean;
  updatedAt: string;
  personas: { id: string; name: string }[];
};

export function Sidebar({ userName }: { userName: string }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"single" | "group" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch, state is set asynchronously after await
    void load();
  }, [load, params?.id]);

  async function deleteChat(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    await load();
    if (params?.id === id) router.push("/chat");
  }

  function handleCreated(conversationId: string) {
    setModalMode(null);
    void load();
    router.push(`/chat/${conversationId}`);
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500 text-lg">
          💬
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Saathi</span>
      </div>

      <div className="flex flex-col gap-2 px-3">
        <button
          onClick={() => setModalMode("single")}
          className="w-full rounded-lg bg-pink-500 px-3 py-2 text-sm font-medium text-white hover:bg-pink-600"
        >
          + New chat
        </button>
        <button
          onClick={() => setModalMode("group")}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          + New group
        </button>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2">
        {loading && (
          <p className="px-2 py-2 text-sm text-zinc-400">Loading...</p>
        )}
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-2 text-sm text-zinc-400">
            No chats yet. Say hi 👋
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center justify-between rounded-lg px-2 py-2 text-sm ${
              params?.id === c.id
                ? "bg-pink-100 text-pink-900 dark:bg-pink-500/20 dark:text-pink-200"
                : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <Link href={`/chat/${c.id}`} className="min-w-0 flex-1 truncate">
              {c.isGroup ? "👥 " : ""}
              {c.title}
            </Link>
            <button
              onClick={() => deleteChat(c.id)}
              className="ml-2 hidden shrink-0 text-zinc-400 hover:text-red-500 group-hover:block"
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <Link
          href="/settings"
          className="mb-1 block rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ⚙️ Settings & memories
        </Link>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="truncate text-sm text-zinc-500">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-zinc-400 hover:text-red-500"
          >
            Sign out
          </button>
        </div>
      </div>

      {modalMode && (
        <NewChatModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onCreated={handleCreated}
        />
      )}
    </aside>
  );
}
