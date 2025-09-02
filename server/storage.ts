// Inline types to avoid @shared imports in production
type User = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type InsertUser = Omit<User, 'createdAt' | 'updatedAt'>;
type UpsertUser = User;

type Word = {
  id: number;
  word: string;
  definition: string;
  difficulty: string;
  category: string;
};

type InsertWord = Pick<Word, 'word' | 'definition'>;

type UserWordHistory = {
  id: number;
  userId?: string;
  deviceId: string;
  word: string;
  seenAt: string;
  guessedCorrectly?: number;
  hintCount?: number;
  gameMode?: string;
};

type InsertUserWordHistory = Omit<UserWordHistory, 'id'>;

type UserPreferences = {
  id: number;
  userId?: string;
  deviceId: string;
  preferredDifficulty?: string;
  soundEnabled?: number;
  hintsEnabled?: number;
  dailyWordGoal?: number;
  vocabulary_level?: string;
  createdAt: string;
  updatedAt: string;
};

type InsertUserPreferences = Omit<UserPreferences, 'id'>;
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { wordService } from "./wordService.js";

export interface IStorage {
  // Authentication methods for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Word methods
  getRandomWord(): Promise<Word | undefined>;
  getAllWords(): Promise<Word[]>;
  createWord(word: InsertWord): Promise<Word>;
  
  // Personal word history methods
  recordWordSeen(history: InsertUserWordHistory): Promise<UserWordHistory>;
  getSeenWords(deviceId: string, userId?: string): Promise<string[]>;
  getUserWordHistory(deviceId: string, userId?: string, limit?: number): Promise<UserWordHistory[]>;
  clearWordHistory(deviceId: string, userId?: string): Promise<void>;
  
  // User preferences methods
  getUserPreferences(deviceId: string, userId?: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(deviceId: string, updates: Partial<InsertUserPreferences>, userId?: string): Promise<UserPreferences>;
}

export class DatabaseStorage implements IStorage {
  // Authentication methods for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Word methods

  async getRandomWord(): Promise<Word | undefined> {
    // Try to get a word from the external API first
    try {
      const apiWord = await wordService.getRandomWordWithDefinition();
      if (apiWord) {
        return apiWord;
      }
    } catch (error) {
      console.error('Failed to fetch word from API, falling back to local words:', error);
    }

    // Fallback to database words if API fails
    const wordArray = await db.select().from(words);
    if (wordArray.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * wordArray.length);
    return wordArray[randomIndex];
  }

  async getAllWords(): Promise<Word[]> {
    return await db.select().from(words);
  }

  async createWord(insertWord: InsertWord): Promise<Word> {
    const [word] = await db
      .insert(words)
      .values({
        word: insertWord.word,
        definition: insertWord.definition,
        difficulty: 'medium',
        category: 'general'
      })
      .returning();
    return word;
  }

  // Personal word history methods
  async recordWordSeen(history: InsertUserWordHistory): Promise<UserWordHistory> {
    const [record] = await db
      .insert(userWordHistory)
      .values(history)
      .returning();
    return record;
  }

  async getSeenWords(deviceId: string, userId?: string): Promise<string[]> {
    const baseQuery = db.select({ word: userWordHistory.word })
      .from(userWordHistory)
      .where(eq(userWordHistory.deviceId, deviceId));
    
    const history = await baseQuery;
    const seenWords = new Set(history.map(h => h.word));
    return Array.from(seenWords);
  }

  async getUserWordHistory(deviceId: string, userId?: string, limit = 100): Promise<UserWordHistory[]> {
    return await db.select()
      .from(userWordHistory)
      .where(eq(userWordHistory.deviceId, deviceId))
      .orderBy(userWordHistory.seenAt)
      .limit(limit);
  }

  async clearWordHistory(deviceId: string, userId?: string): Promise<void> {
    await db.delete(userWordHistory)
      .where(eq(userWordHistory.deviceId, deviceId));
  }

  // User preferences methods
  async getUserPreferences(deviceId: string, userId?: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.deviceId, deviceId));
    
    return prefs || undefined;
  }

  async saveUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(preferences)
      .returning();
    return prefs;
  }

  async updateUserPreferences(deviceId: string, updates: Partial<InsertUserPreferences>, userId?: string): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(deviceId, userId);
    
    const updated: InsertUserPreferences = {
      userId: userId || null,
      deviceId,
      preferredDifficulty: updates.preferredDifficulty || existing?.preferredDifficulty || 'mixed',
      soundEnabled: updates.soundEnabled ?? existing?.soundEnabled ?? 1,
      hintsEnabled: updates.hintsEnabled ?? existing?.hintsEnabled ?? 1,
      dailyWordGoal: updates.dailyWordGoal || existing?.dailyWordGoal || 10,
      vocabulary_level: updates.vocabulary_level || existing?.vocabulary_level || 'intermediate',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      const [prefs] = await db
        .update(userPreferences)
        .set(updated)
        .where(eq(userPreferences.id, existing.id))
        .returning();
      return prefs;
    } else {
      return this.saveUserPreferences(updated);
    }
  }
}

export const storage = new DatabaseStorage();
