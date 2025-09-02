import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  serial,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const words = pgTable("words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  definition: text("definition").notNull(),
  difficulty: text("difficulty").notNull().default("medium"), // easy, medium, hard
  category: text("category").notNull().default("general"),
});

export const insertWordSchema = createInsertSchema(words).pick({
  word: true,
  definition: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Game sessions for tracking timed challenges
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  playerName: text("player_name"),
  mode: text("mode").notNull(), // "3min", "5min", "endless"
  difficulty: text("difficulty").notNull(), // "easy", "medium", "hard", "mixed"
  score: integer("score").notNull().default(0),
  correctGuesses: integer("correct_guesses").notNull().default(0),
  totalWords: integer("total_words").notNull().default(0),
  hintsUsed: integer("hints_used").notNull().default(0),
  timeLimit: integer("time_limit").notNull(), // in seconds
  completedAt: text("completed_at").notNull(),
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  playerName: true,
  mode: true,
  difficulty: true,
  score: true,
  correctGuesses: true,
  totalWords: true,
  hintsUsed: true,
  timeLimit: true,
  completedAt: true,
});

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

// User word history for personalized experience
export const userWordHistory = pgTable("user_word_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Can be null for anonymous users, references users.id
  deviceId: text("device_id").notNull(), // Browser fingerprint or device ID
  word: text("word").notNull(),
  seenAt: text("seen_at").notNull(),
  guessedCorrectly: integer("guessed_correctly").default(0), // 0 = not guessed, 1 = correct, -1 = incorrect
  hintCount: integer("hint_count").default(0), // How many hints were used
  gameMode: text("game_mode").default("normal"), // "normal", "timed", "challenge"
});

export const insertUserWordHistorySchema = createInsertSchema(userWordHistory).pick({
  userId: true,
  deviceId: true,
  word: true,
  seenAt: true,
  guessedCorrectly: true,
  hintCount: true,
  gameMode: true,
});

export type InsertUserWordHistory = z.infer<typeof insertUserWordHistorySchema>;
export type UserWordHistory = typeof userWordHistory.$inferSelect;

// User preferences for personalized gameplay
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Can be null for anonymous users, references users.id
  deviceId: text("device_id").notNull(), // Browser fingerprint or device ID
  preferredDifficulty: text("preferred_difficulty").default("mixed"), // "easy", "medium", "hard", "mixed"
  soundEnabled: integer("sound_enabled").default(1), // 0 = off, 1 = on
  hintsEnabled: integer("hints_enabled").default(1), // 0 = off, 1 = on
  dailyWordGoal: integer("daily_word_goal").default(10), // Target words per day
  vocabulary_level: text("vocabulary_level").default("intermediate"), // "elementary", "intermediate", "advanced"
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  deviceId: true,
  preferredDifficulty: true,
  soundEnabled: true,
  hintsEnabled: true,
  dailyWordGoal: true,
  vocabulary_level: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
