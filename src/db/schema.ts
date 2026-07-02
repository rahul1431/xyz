import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// A companion character the user has created, e.g. "Surekha", "Sunitha".
// Each one has its own name and language style, and can be reused across
// chats or brought together into a group chat.
export const personas = sqliteTable("personas", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  language: text("language", {
    enum: ["english", "hinglish", "tenglish"],
  })
    .notNull()
    .default("hinglish"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const conversations = sqliteTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New chat"),
  isGroup: integer("is_group", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Which personas belong to a conversation. Exactly one for a normal 1:1
// chat, two or more for a group chat.
export const conversationPersonas = sqliteTable(
  "conversation_personas",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    personaId: text("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.conversationId, table.personaId] })],
);

export const messages = sqliteTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  // Which persona sent this message, when role is "assistant".
  personaId: text("persona_id").references(() => personas.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  attachmentName: text("attachment_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Long-term memory: facts the AI has learned about the user, carried across
// every conversation (not just the current thread's message history).
export const memories = sqliteTable("memories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  source: text("source", { enum: ["auto", "manual"] })
    .notNull()
    .default("auto"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
