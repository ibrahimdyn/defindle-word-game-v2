import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { wordService } from "./wordService";
import { EnhancedWordService } from "./enhancedWordService";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Inline schema definitions to avoid @shared imports in production
const insertUserWordHistorySchema = z.object({
  userId: z.string().optional(),
  deviceId: z.string(),
  word: z.string(),
  seenAt: z.string(),
  guessedCorrectly: z.number().optional(),
  hintCount: z.number().optional(),
  gameMode: z.string().optional(),
});

const insertUserPreferencesSchema = z.object({
  userId: z.string().optional(),
  deviceId: z.string(),
  preferredDifficulty: z.string().optional(),
  soundEnabled: z.number().optional(),
  hintsEnabled: z.number().optional(),
  dailyWordGoal: z.number().optional(),
  vocabulary_level: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication disabled for mobile funnel strategy
  // await setupAuth(app);

  // Auth routes disabled for mobile funnel strategy
  // app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  //   try {
  //     const userId = req.user.claims.sub;
  //     const user = await storage.getUser(userId);
  //     res.json(user);
  //   } catch (error) {
  //     console.error("Error fetching user:", error);
  //     res.status(500).json({ message: "Failed to fetch user" });
  //   }
  // });
  // Get random word for the game (using BNC/COCA database)
  app.get("/api/words/random", async (req, res) => {
    try {
      const enhancedWordService = EnhancedWordService.getInstance();
      const word = await enhancedWordService.getRandomWordWithDefinition();
      if (!word) {
        return res.status(404).json({ message: "No words available" });
      }
      res.json(word);
    } catch (error) {
      console.error("Error fetching random word:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all words
  app.get("/api/words", async (req, res) => {
    try {
      const words = await storage.getAllWords();
      res.json(words);
    } catch (error) {
      console.error("Error fetching words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Save game session
  app.post("/api/game-sessions", async (req, res) => {
    try {
      const session = req.body;
      // In memory storage for now - in production this would save to database
      const sessionWithId = { id: Date.now(), ...session };
      res.json(sessionWithId);
    } catch (error) {
      console.error("Error saving game session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Personal word history endpoints
  app.post("/api/word-history", async (req, res) => {
    try {
      const historyData = insertUserWordHistorySchema.parse(req.body);
      const record = await storage.recordWordSeen(historyData);
      res.json(record);
    } catch (error) {
      console.error("Error recording word history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/word-history/seen/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId } = req.query;
      const seenWords = await storage.getSeenWords(deviceId, userId as string);
      res.json({ seenWords });
    } catch (error) {
      console.error("Error fetching seen words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/word-history/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId, limit } = req.query;
      const history = await storage.getUserWordHistory(
        deviceId, 
        userId as string, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json({ history });
    } catch (error) {
      console.error("Error fetching word history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/word-history/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId } = req.query;
      await storage.clearWordHistory(deviceId, userId as string);
      res.json({ message: "Word history cleared" });
    } catch (error) {
      console.error("Error clearing word history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User preferences endpoints
  app.get("/api/preferences/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId } = req.query;
      const preferences = await storage.getUserPreferences(deviceId, userId as string);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/preferences", async (req, res) => {
    try {
      const preferencesData = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.saveUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/preferences/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId } = req.query;
      const updates = req.body;
      const preferences = await storage.updateUserPreferences(deviceId, updates, userId as string);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Smart word selection that avoids repetition
  app.get("/api/words/smart/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { userId, difficulty } = req.query;
      
      // Get seen words for this user/device
      const seenWords = await storage.getSeenWords(deviceId, userId as string);
      
      // Get word with enhanced service using smart selection
      const enhancedWordService = EnhancedWordService.getInstance();
      const word = await enhancedWordService.getSmartWordSelection(
        seenWords,
        (difficulty as 'easy' | 'medium' | 'hard' | 'mixed') || 'mixed'
      );
      
      if (!word) {
        return res.status(404).json({ message: "No new words available" });
      }
      
      res.json(word);
    } catch (error) {
      console.error("Error fetching smart word:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get game sessions (leaderboard)
  app.get("/api/game-sessions", async (req, res) => {
    try {
      // Return empty array for now - in production this would fetch from database
      res.json([]);
    } catch (error) {
      console.error("Error fetching game sessions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Enhanced API endpoints for frequency-based word classification

  // Get random word with authentic frequency ranking
  app.get("/api/words/enhanced/random", async (req, res) => {
    try {
      const enhancedWordService = EnhancedWordService.getInstance();
      const word = await enhancedWordService.getRandomWordWithDefinition();
      if (!word) {
        return res.status(404).json({ message: "No words available" });
      }
      res.json(word);
    } catch (error) {
      console.error("Error fetching enhanced random word:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get word by difficulty for timed challenges
  app.get("/api/words/enhanced/difficulty/:difficulty", async (req, res) => {
    try {
      const { difficulty } = req.params;
      
      if (!['easy', 'medium', 'hard', 'mixed'].includes(difficulty)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }
      
      const enhancedWordService = EnhancedWordService.getInstance();
      const word = await enhancedWordService.getWordByDifficulty(difficulty as any);
      if (!word) {
        return res.status(404).json({ message: "No words available for this difficulty" });
      }
      res.json(word);
    } catch (error) {
      console.error("Error fetching word by difficulty:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get word statistics and database info
  app.get("/api/words/enhanced/stats", async (req, res) => {
    try {
      const enhancedWordService = EnhancedWordService.getInstance();
      const stats = enhancedWordService.getWordStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching word stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get words by frequency range for educational progression
  app.get("/api/words/enhanced/frequency-range", async (req, res) => {
    try {
      const { minRank = 1, maxRank = 1000 } = req.query;
      const enhancedWordService = EnhancedWordService.getInstance();
      const words = enhancedWordService.getWordsByFrequencyRange(
        parseInt(minRank as string), 
        parseInt(maxRank as string)
      );
      res.json(words);
    } catch (error) {
      console.error("Error fetching words by frequency range:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get educational level words
  app.get("/api/words/enhanced/educational/:level", async (req, res) => {
    try {
      const { level } = req.params;
      
      if (!['elementary', 'intermediate', 'advanced'].includes(level)) {
        return res.status(400).json({ message: "Invalid educational level" });
      }
      
      const enhancedWordService = EnhancedWordService.getInstance();
      const words = enhancedWordService.getEducationalWords(level as any);
      res.json(words);
    } catch (error) {
      console.error("Error fetching educational words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Search words by pattern
  app.get("/api/words/enhanced/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const enhancedWordService = EnhancedWordService.getInstance();
      const words = enhancedWordService.searchWords(q);
      res.json(words);
    } catch (error) {
      console.error("Error searching words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset used words tracking
  app.post("/api/words/enhanced/reset", async (req, res) => {
    try {
      const enhancedWordService = EnhancedWordService.getInstance();
      enhancedWordService.resetUsedWords();
      res.json({ message: "Used words tracking reset successfully" });
    } catch (error) {
      console.error("Error resetting used words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get word statistics
  app.get("/api/words/stats", async (req, res) => {
    try {
      const stats = wordService.getWordStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching word stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
