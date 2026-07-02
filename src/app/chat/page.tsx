"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewChatModal } from "@/components/NewChatModal";

export default function ChatEmptyState() {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<"single" | "group" | null>(null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">💬</div>
      <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
        Start a conversation
      </h2>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Your companions remember things about you across every chat. Pick up
        right where you left off, or start something new.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setModalMode("single")}
          className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600"
        >
          + New chat
        </button>
        <button
          onClick={() => setModalMode("group")}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          + New group
        </button>
      </div>

      {modalMode && (
        <NewChatModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onCreated={(id) => router.push(`/chat/${id}`)}
        />
      )}
    </div>
  );
}
