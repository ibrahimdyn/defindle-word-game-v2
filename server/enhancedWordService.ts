// Enhanced word service with authentic frequency-based classification
// Inline Word type to avoid @shared imports in production
type Word = {
  id: number;
  word: string;
  definition: string;
  difficulty: string;
  category: string;
};
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the comprehensive word database (priority: BNC/COCA Complete > fallback)
const BNC_COCA_COMPLETE_PATH = path.join(__dirname, 'bnc-coca-complete-database.json');
const FALLBACK_DATABASE_PATH = path.join(__dirname, '../word-database-builder/word-database.json');

const DATABASE_PATH = fs.existsSync(BNC_COCA_COMPLETE_PATH) 
  ? BNC_COCA_COMPLETE_PATH 
  : FALLBACK_DATABASE_PATH;
let WORD_DATABASE: any[] = [];

// Initialize database
try {
  if (fs.existsSync(DATABASE_PATH)) {
    const database = JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
    WORD_DATABASE = database.words || [];
    console.log(`📚 Loaded ${WORD_DATABASE.length} words with authentic frequency rankings`);
  } else {
    console.log('📋 Word database not found, using fallback word list');
    WORD_DATABASE = getFallbackWordList();
  }
} catch (error) {
  console.error('Error loading word database:', error);
  WORD_DATABASE = getFallbackWordList();
}

// Quick lookup by difficulty for timed challenges
const WORDS_BY_DIFFICULTY = {
  easy: WORD_DATABASE.filter(w => w.difficulty === 'common').slice(0, 200),
  medium: WORD_DATABASE.filter(w => w.difficulty === 'moderate').slice(0, 200),
  hard: WORD_DATABASE.filter(w => w.difficulty === 'expert').slice(0, 200)
};

export class EnhancedWordService {
  private static instance: EnhancedWordService;
  private usedWords: Set<string> = new Set();
  private wordIndex: Map<string, any> = new Map();

  public static getInstance(): EnhancedWordService {
    if (!EnhancedWordService.instance) {
      EnhancedWordService.instance = new EnhancedWordService();
    }
    return EnhancedWordService.instance;
  }

  constructor() {
    // Index all words for fast lookup
    WORD_DATABASE.forEach(word => {
      this.wordIndex.set(word.word, word);
    });
    
    console.log(`🎯 Enhanced Word Service initialized with ${WORD_DATABASE.length} words`);
    console.log(`   • Common: ${WORDS_BY_DIFFICULTY.easy.length} words`);
    console.log(`   • Moderate: ${WORDS_BY_DIFFICULTY.medium.length} words`);
    console.log(`   • Expert: ${WORDS_BY_DIFFICULTY.hard.length} words`);
  }

  /**
   * Get random word with authentic frequency-based difficulty
   */
  async getRandomWordWithDefinition(): Promise<Word | null> {
    const availableWords = WORD_DATABASE.filter(word => !this.usedWords.has(word.word));
    
    if (availableWords.length === 0) {
      this.usedWords.clear(); // Reset when exhausted
      return this.getRandomWordWithDefinition();
    }
    
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    this.usedWords.add(randomWord.word);
    
    return {
      id: Date.now(),
      word: randomWord.word,
      definition: randomWord.definition,
      difficulty: this.mapDifficulty(randomWord.difficulty),
      category: randomWord.category || 'general'
    };
  }

  /**
   * Get word by specific difficulty for timed challenges
   */
  async getWordByDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'mixed'): Promise<Word | null> {
    let wordPool: any[];
    
    switch (difficulty) {
      case 'easy':
        wordPool = WORDS_BY_DIFFICULTY.easy;
        break;
      case 'medium':
        wordPool = WORDS_BY_DIFFICULTY.medium;
        break;
      case 'hard':
        wordPool = WORDS_BY_DIFFICULTY.hard;
        break;
      case 'mixed':
        wordPool = WORD_DATABASE;
        break;
      default:
        wordPool = WORD_DATABASE;
    }
    
    const availableWords = wordPool.filter(word => !this.usedWords.has(word.word));
    
    if (availableWords.length === 0) {
      // Reset for this difficulty level
      wordPool.forEach(word => this.usedWords.delete(word.word));
      return this.getWordByDifficulty(difficulty);
    }
    
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    this.usedWords.add(randomWord.word);
    
    return {
      id: Date.now(),
      word: randomWord.word,
      definition: randomWord.definition,
      difficulty: this.mapDifficulty(randomWord.difficulty),
      category: randomWord.category || 'general'
    };
  }

  /**
   * Map database difficulty to game difficulty
   */
  private mapDifficulty(dbDifficulty: string): string {
    switch (dbDifficulty) {
      case 'common': return 'easy';
      case 'moderate': return 'medium';
      case 'expert': return 'hard';
      default: return 'medium';
    }
  }

  /**
   * Get statistics about the word database
   */
  getWordStats(): { 
    total: number; 
    common: number; 
    moderate: number; 
    expert: number; 
    used: number;
    database_version: string;
    source: string;
  } {
    return {
      total: WORD_DATABASE.length,
      common: WORDS_BY_DIFFICULTY.easy.length,
      moderate: WORDS_BY_DIFFICULTY.medium.length,
      expert: WORDS_BY_DIFFICULTY.hard.length,
      used: this.usedWords.size,
      database_version: '2.0.0',
      source: 'Enhanced COCA Frequency Data + Dictionary API'
    };
  }

  /**
   * Get word by exact match for validation
   */
  getWordByText(word: string): Word | null {
    const dbWord = this.wordIndex.get(word.toUpperCase());
    if (!dbWord) return null;
    
    return {
      id: Date.now(),
      word: dbWord.word,
      definition: dbWord.definition,
      difficulty: this.mapDifficulty(dbWord.difficulty),
      category: dbWord.category || 'general'
    };
  }

  /**
   * Reset used words tracking
   */
  resetUsedWords(): void {
    this.usedWords.clear();
  }

  /**
   * Smart word selection that avoids user's seen words
   */
  async getSmartWordSelection(seenWords: string[], difficulty: string = 'mixed'): Promise<Word | null> {
    let wordPool: any[];
    
    switch (difficulty) {
      case 'easy':
        wordPool = WORDS_BY_DIFFICULTY.easy;
        break;
      case 'medium':
        wordPool = WORDS_BY_DIFFICULTY.medium;
        break;
      case 'hard':
        wordPool = WORDS_BY_DIFFICULTY.hard;
        break;
      case 'mixed':
      default:
        wordPool = WORD_DATABASE;
    }
    
    // Filter out words the user has already seen
    const unseenWords = wordPool.filter(word => 
      !seenWords.includes(word.word.toUpperCase()) && 
      !this.usedWords.has(word.word)
    );
    
    // If no unseen words, reset and try again (they've seen everything)
    if (unseenWords.length === 0) {
      console.log(`🔄 User has seen all ${wordPool.length} words in ${difficulty} difficulty. Resetting for variety.`);
      // Don't clear their permanent history, just reset session tracking
      this.usedWords.clear();
      
      // Get a random word they've seen before (better than no word)
      const availableWords = wordPool.filter(word => !this.usedWords.has(word.word));
      if (availableWords.length === 0) {
        return null;
      }
      
      const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      this.usedWords.add(randomWord.word);
      
      return {
        id: Date.now(),
        word: randomWord.word,
        definition: randomWord.definition,
        difficulty: this.mapDifficulty(randomWord.difficulty),
        category: randomWord.category || 'general'
      };
    }
    
    // Select random unseen word
    const randomWord = unseenWords[Math.floor(Math.random() * unseenWords.length)];
    this.usedWords.add(randomWord.word);
    
    return {
      id: Date.now(),
      word: randomWord.word,
      definition: randomWord.definition,
      difficulty: this.mapDifficulty(randomWord.difficulty),
      category: randomWord.category || 'general'
    };
  }

  /**
   * Get words by frequency range for educational progression
   */
  getWordsByFrequencyRange(minRank: number, maxRank: number): Word[] {
    return WORD_DATABASE
      .filter(word => word.frequency_rank >= minRank && word.frequency_rank <= maxRank)
      .map(dbWord => ({
        id: Date.now() + Math.random(),
        word: dbWord.word,
        definition: dbWord.definition,
        difficulty: this.mapDifficulty(dbWord.difficulty),
        category: dbWord.category || 'general'
      }));
  }

  /**
   * Search words by pattern for admin/testing
   */
  searchWords(pattern: string): Word[] {
    const regex = new RegExp(pattern.toLowerCase());
    return WORD_DATABASE
      .filter(word => 
        regex.test(word.word.toLowerCase()) || regex.test(word.definition.toLowerCase())
      )
      .map(dbWord => ({
        id: Date.now() + Math.random(),
        word: dbWord.word,
        definition: dbWord.definition,
        difficulty: this.mapDifficulty(dbWord.difficulty),
        category: dbWord.category || 'general'
      }));
  }

  /**
   * Get words for specific educational level
   */
  getEducationalWords(level: 'elementary' | 'intermediate' | 'advanced'): Word[] {
    let rankRange: [number, number];
    
    switch (level) {
      case 'elementary':
        rankRange = [1, 1000];
        break;
      case 'intermediate':
        rankRange = [1001, 5000];
        break;
      case 'advanced':
        rankRange = [5001, 60000];
        break;
      default:
        rankRange = [1, 60000];
    }
    
    return this.getWordsByFrequencyRange(rankRange[0], rankRange[1]);
  }
}

/**
 * Fallback word list if database is not available
 */
function getFallbackWordList() {
  return [
    {
      word: 'HOUSE',
      definition: 'A building for human habitation.',
      frequency_rank: 150,
      difficulty: 'common',
      category: 'general',
      length: 5
    },
    {
      word: 'WATER',
      definition: 'A transparent liquid that forms rivers, lakes, oceans, and rain.',
      frequency_rank: 95,
      difficulty: 'common',
      category: 'general',
      length: 5
    },
    {
      word: 'SCHOOL',
      definition: 'An institution for educating children.',
      frequency_rank: 360,
      difficulty: 'common',
      category: 'general',
      length: 6
    }
  ];
}

export const enhancedWordService = EnhancedWordService.getInstance();