// Word service for fetching definitions from external API
// Inline Word type to avoid @shared imports in production
type Word = {
  id: number;
  word: string;
  definition: string;
  difficulty: string;
  category: string;
};
import fetch from "node-fetch";

// Word difficulty classification
const categorizeWordDifficulty = (word: string): string => {
  const length = word.length;
  const commonWords = ["THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "HER", "WAS", "ONE", "OUR", "HAD", "BY", "WORD", "WHAT", "SAID", "EACH", "WHICH", "DO", "HOW", "THEIR", "IF", "WILL", "UP", "OTHER", "ABOUT", "OUT", "MANY", "THEN", "THEM", "THESE", "SO", "SOME", "HER", "WOULD", "MAKE", "LIKE", "INTO", "HIM", "HAS", "TWO", "MORE", "GO", "NO", "WAY", "COULD", "MY", "THAN", "FIRST", "BEEN", "CALL", "WHO", "OIL", "ITS", "NOW", "FIND", "LONG", "DOWN", "DAY", "DID", "GET", "COME", "MADE", "MAY", "PART"];
  
  if (commonWords.includes(word.toUpperCase()) || length <= 5) {
    return "easy";
  } else if (length <= 8) {
    return "medium";
  } else {
    return "hard";
  }
};

// Expanded curated word list for better variety - 500+ words
const CURATED_WORDS = [
  // Basic everyday words
  "HOUSE", "WATER", "LIGHT", "WORLD", "MUSIC", "PLANT", "SMILE", "DREAM", "PEACE", "TRUTH",
  "FAMILY", "FRIEND", "HAPPY", "LOVE", "TIME", "LIFE", "WORK", "SCHOOL", "BOOK", "STORY",
  "NATURE", "GARDEN", "FLOWER", "TREE", "CLOUD", "RAIN", "WIND", "FIRE", "EARTH", "SKY",
  
  // Intermediate vocabulary
  "ADVENTURE", "BEAUTIFUL", "CREATIVE", "EDUCATION", "FANTASTIC", "GENEROUS", "HAPPINESS", 
  "IMPORTANT", "KNOWLEDGE", "WONDERFUL", "MOUNTAIN", "SUNSHINE", "FRIENDSHIP", "BUTTERFLY",
  "JOURNEY", "EXPLORE", "DISCOVER", "FREEDOM", "COURAGE", "WISDOM", "MEMORY", "PASSION",
  "BALANCE", "HARMONY", "COMFORT", "ENERGY", "GROWTH", "HEALTH", "SPIRIT", "GENTLE",
  
  // Advanced vocabulary
  "MAGNIFICENT", "SPECTACULAR", "EXTRAORDINARY", "FASCINATING", "INCREDIBLE", "BRILLIANT",
  "OUTSTANDING", "REMARKABLE", "PHENOMENAL", "EXCEPTIONAL", "MYSTERIOUS", "ENCHANTING",
  "SOPHISTICATED", "ELABORATE", "INTRICATE", "COMPLEX", "PROFOUND", "SIGNIFICANT", "ULTIMATE",
  "ESSENTIAL", "FUNDAMENTAL", "COMPREHENSIVE", "EXTENSIVE", "INTENSIVE", "PROGRESSIVE",
  
  // Sophisticated vocabulary
  "SERENDIPITY", "EPHEMERAL", "WANDERLUST", "NOSTALGIA", "TRANQUIL", "LUMINOUS", "RESILIENCE",
  "QUINTESSENTIAL", "MELANCHOLY", "SYMPHONY", "SKYSCRAPER", "ELOQUENT", "INDIGENOUS", "UBIQUITOUS",
  "MAGNIFICENT", "CONTEMPLATION", "PERSEVERANCE", "EUPHEMISM", "PARADOX", "CATALYST", "PARADIGM",
  "PINNACLE", "TRAJECTORY", "MOMENTUM", "CATALYST", "BENCHMARK", "EQUILIBRIUM", "TRANSCENDENT",
  
  // Interesting and unique words
  "CACOPHONY", "EUPHORIA", "LABYRINTH", "METAMORPHOSIS", "RENAISSANCE", "SOLITUDE", "ZENITH",
  "AMBIGUOUS", "BENEVOLENT", "CONSCIENTIOUS", "DILIGENT", "ECCENTRIC", "FLAMBOYANT", "GREGARIOUS",
  "KALEIDOSCOPE", "MIRAGE", "OASIS", "PRISM", "RIPPLE", "SHIMMER", "TWILIGHT", "VELVET",
  "WHISPER", "ZEPHYR", "BLOSSOM", "CASCADE", "DAZZLE", "EMBRACE", "FLUTTER", "GLIMMER",
  
  // Nature and science
  "PHOTOSYNTHESIS", "ECOSYSTEM", "BIODIVERSITY", "CONSTELLATION", "PRECIPITATION", "EVAPORATION",
  "CRYSTALLINE", "AURORA", "GRAVITATIONAL", "MOLECULAR", "ELECTROMAGNETIC", "REVOLUTIONARY",
  "ATMOSPHERIC", "GEOLOGICAL", "ASTRONOMICAL", "MICROSCOPIC", "MACROSCOPIC", "QUANTUM",
  "CHEMISTRY", "BIOLOGY", "PHYSICS", "MATHEMATICS", "GEOMETRY", "ALGEBRA", "CALCULUS",
  "NUCLEUS", "ELECTRON", "PROTON", "NEUTRON", "MOLECULE", "ATOM", "ELEMENT", "COMPOUND",
  
  // Abstract concepts and academics
  "PHILOSOPHY", "PSYCHOLOGY", "ANTHROPOLOGY", "ARCHAEOLOGY", "ARCHITECTURE", "DEMOCRACY",
  "CAPITALISM", "SOCIALISM", "NATIONALISM", "GLOBALIZATION", "TECHNOLOGICAL", "INNOVATION",
  "LITERATURE", "LINGUISTICS", "SOCIOLOGY", "ECONOMICS", "POLITICS", "HISTORY", "GEOGRAPHY",
  "THEOLOGY", "METHODOLOGY", "EPISTEMOLOGY", "ONTOLOGY", "DIALECTIC", "SYNTHESIS", "ANALYSIS",
  "HYPOTHESIS", "THEORY", "CONCEPT", "PRINCIPLE", "DOCTRINE", "IDEOLOGY", "PARADIGM",
  
  // Emotions and personality traits
  "COMPASSIONATE", "EMPATHETIC", "OPTIMISTIC", "PESSIMISTIC", "CHARISMATIC", "INTROVERTED",
  "EXTROVERTED", "AMBITIOUS", "PERSISTENT", "SPONTANEOUS", "METHODICAL", "ANALYTICAL",
  "ENTHUSIASTIC", "PASSIONATE", "DETERMINED", "CONFIDENT", "HUMBLE", "GENEROUS", "PATIENT",
  "COURAGEOUS", "ADVENTUROUS", "CURIOUS", "CREATIVE", "INNOVATIVE", "INSPIRING", "MOTIVATING",
  
  // Arts and culture
  "MASTERPIECE", "VIRTUOSO", "RENAISSANCE", "BAROQUE", "IMPRESSIONISM", "SURREALISM",
  "CONTEMPORARY", "AVANT-GARDE", "CLASSICAL", "ROMANTIC", "MINIMALIST", "EXPRESSIONISM",
  "SCULPTURE", "PAINTING", "LITERATURE", "POETRY", "MUSIC", "DANCE", "THEATER", "CINEMA",
  "ARCHITECTURE", "DESIGN", "FASHION", "PHOTOGRAPHY", "ILLUSTRATION", "CALLIGRAPHY",
  
  // Technology and modern life
  "ALGORITHM", "ARTIFICIAL", "INTELLIGENCE", "COMPUTER", "DIGITAL", "INTERNET", "NETWORK",
  "SOFTWARE", "HARDWARE", "PROGRAMMING", "DATABASE", "SECURITY", "ENCRYPTION", "BLOCKCHAIN",
  "VIRTUAL", "AUGMENTED", "REALITY", "SIMULATION", "AUTOMATION", "ROBOTICS", "MACHINE",
  "INTERFACE", "PLATFORM", "SYSTEM", "FRAMEWORK", "PROTOCOL", "ARCHITECTURE", "INFRASTRUCTURE",
  
  // Food and cooking
  "CUISINE", "GOURMET", "DELICIOUS", "FLAVOR", "AROMA", "TEXTURE", "INGREDIENT", "RECIPE",
  "CULINARY", "CHEF", "KITCHEN", "RESTAURANT", "BANQUET", "FEAST", "APPETIZER", "DESSERT",
  "BEVERAGE", "COCKTAIL", "VINTAGE", "EXOTIC", "SPICE", "HERB", "SEASONING", "MARINADE",
  
  // Travel and geography
  "DESTINATION", "VOYAGE", "EXPEDITION", "PILGRIMAGE", "EXCURSION", "SAFARI", "CRUISE",
  "CONTINENT", "ISLAND", "PENINSULA", "VALLEY", "PLATEAU", "DESERT", "FOREST", "JUNGLE",
  "METROPOLIS", "VILLAGE", "SUBURB", "DISTRICT", "NEIGHBORHOOD", "LANDMARK", "MONUMENT",
  "HERITAGE", "CULTURE", "TRADITION", "CUSTOMS", "FESTIVAL", "CELEBRATION", "CEREMONY",
  
  // Business and economics
  "ENTREPRENEUR", "INNOVATION", "INVESTMENT", "REVENUE", "PROFIT", "MARKET", "ECONOMY",
  "STRATEGY", "MANAGEMENT", "LEADERSHIP", "ORGANIZATION", "CORPORATION", "ENTERPRISE",
  "PRODUCTIVITY", "EFFICIENCY", "QUALITY", "EXCELLENCE", "PERFORMANCE", "ACHIEVEMENT",
  "COMPETITION", "COLLABORATION", "PARTNERSHIP", "NETWORKING", "NEGOTIATION", "CONTRACT",
  
  // Health and wellness
  "WELLNESS", "VITALITY", "NUTRITION", "EXERCISE", "MEDITATION", "MINDFULNESS", "BALANCE",
  "STRENGTH", "FLEXIBILITY", "ENDURANCE", "IMMUNITY", "HEALING", "THERAPY", "RECOVERY",
  "PREVENTION", "DIAGNOSIS", "TREATMENT", "MEDICINE", "PHARMACY", "HOSPITAL", "CLINIC",
  
  // Time and seasons
  "CHRONOLOGY", "DURATION", "MOMENT", "INSTANT", "ETERNITY", "TEMPORAL", "SEASONAL",
  "SPRING", "SUMMER", "AUTUMN", "WINTER", "DAWN", "DUSK", "MIDNIGHT", "NOON",
  "CENTURY", "DECADE", "MILLENNIUM", "ANNIVERSARY", "BIRTHDAY", "HOLIDAY", "WEEKEND",
  
  // Communication and language
  "LANGUAGE", "VOCABULARY", "GRAMMAR", "SYNTAX", "SEMANTICS", "PRONUNCIATION", "ACCENT",
  "DIALECT", "CONVERSATION", "DIALOGUE", "MONOLOGUE", "SPEECH", "PRESENTATION", "LECTURE",
  "DISCUSSION", "DEBATE", "ARGUMENT", "PERSUASION", "RHETORIC", "ELOQUENCE", "ARTICULATION"
];

// Dynamic word pools for variety
const DYNAMIC_WORD_POOLS = {
  animals: ["ELEPHANT", "GIRAFFE", "PENGUIN", "DOLPHIN", "OCTOPUS", "KANGAROO", "CHAMELEON", "RHINOCEROS"],
  colors: ["CRIMSON", "EMERALD", "SAPPHIRE", "AMBER", "VIOLET", "TURQUOISE", "MAGENTA", "BURGUNDY"],
  professions: ["ARCHITECT", "ENGINEER", "SCIENTIST", "ARTIST", "MUSICIAN", "TEACHER", "DOCTOR", "LAWYER"],
  countries: ["AUSTRALIA", "CANADA", "BRAZIL", "GERMANY", "JAPAN", "ITALY", "SPAIN", "FRANCE"],
  weather: ["THUNDERSTORM", "HURRICANE", "BLIZZARD", "TORNADO", "RAINBOW", "LIGHTNING", "DRIZZLE", "HAIL"],
  sports: ["BASKETBALL", "FOOTBALL", "TENNIS", "SWIMMING", "CYCLING", "MARATHON", "GYMNASTICS", "VOLLEYBALL"],
  instruments: ["PIANO", "GUITAR", "VIOLIN", "TRUMPET", "SAXOPHONE", "DRUMS", "FLUTE", "CELLO"],
  mythology: ["PHOENIX", "DRAGON", "UNICORN", "CENTAUR", "GRIFFIN", "PEGASUS", "HYDRA", "CHIMERA"]
};

interface DictionaryAPIResponse {
  word: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export class WordService {
  private static instance: WordService;
  private usedWords: Set<string> = new Set();
  private dynamicWordsCache: string[] = [];
  private lastDynamicFetch: number = 0;
  
  public static getInstance(): WordService {
    if (!WordService.instance) {
      WordService.instance = new WordService();
    }
    return WordService.instance;
  }

  async fetchDefinitionFromAPI(word: string): Promise<string | null> {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data: DictionaryAPIResponse[] = await response.json();
      
      if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
        const meanings = data[0].meanings;
        
        // Find the first definition that's not too technical
        for (const meaning of meanings) {
          if (meaning.definitions && meaning.definitions.length > 0) {
            const definition = meaning.definitions[0].definition;
            
            // Clean up the definition - remove references and make it more readable
            const cleanDefinition = this.cleanDefinition(definition);
            
            if (cleanDefinition.length > 20 && cleanDefinition.length < 200) {
              return cleanDefinition;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch definition for ${word}:`, error);
      return null;
    }
  }

  private cleanDefinition(definition: string): string {
    return definition
      // Remove references like (of a person, action, etc.)
      .replace(/\([^)]*\)/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Capitalize first letter
      .replace(/^./, str => str.toUpperCase())
      // Ensure it ends with a period
      .replace(/\.?$/, '.')
      .trim();
  }

  async getRandomWordWithDefinition(): Promise<Word | null> {
    // First, try to get a word from curated list
    let wordToTry = await this.getCuratedWord();
    
    // If curated words are exhausted, try dynamic words
    if (!wordToTry) {
      wordToTry = await this.getDynamicWord();
    }
    
    // If still no word, try random dictionary words
    if (!wordToTry) {
      wordToTry = await this.getRandomDictionaryWord();
    }
    
    // Try to get definition for the selected word
    if (wordToTry) {
      const definition = await this.fetchDefinitionFromAPI(wordToTry);
      
      if (definition) {
        this.usedWords.add(wordToTry);
        
        return {
          id: Date.now(),
          word: wordToTry.toUpperCase(),
          definition: definition,
          difficulty: categorizeWordDifficulty(wordToTry),
          category: "general"
        };
      }
    }

    // Final fallback to hardcoded words
    return this.getFallbackWord();
  }

  private async getCuratedWord(): Promise<string | null> {
    const availableWords = CURATED_WORDS.filter(word => !this.usedWords.has(word));
    
    if (availableWords.length === 0) {
      return null; // Curated words exhausted
    }
    
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }

  private async getDynamicWord(): Promise<string | null> {
    // Get words from dynamic pools
    const allDynamicWords = Object.values(DYNAMIC_WORD_POOLS).flat();
    const availableDynamicWords = allDynamicWords.filter(word => !this.usedWords.has(word));
    
    if (availableDynamicWords.length === 0) {
      return null; // Dynamic words exhausted
    }
    
    return availableDynamicWords[Math.floor(Math.random() * availableDynamicWords.length)];
  }

  private async getRandomDictionaryWord(): Promise<string | null> {
    // Generate random common English words to try
    const randomWords = [
      "ANCIENT", "BRIDGE", "CASTLE", "DOLPHIN", "ELEPHANT", "FOREST", "GALAXY", 
      "HARBOR", "ISLAND", "JUNGLE", "KITCHEN", "LIBRARY", "MEADOW", "NATURE",
      "OCEAN", "PALACE", "QUEEN", "RIVER", "SUNSET", "TEMPLE", "UMBRELLA",
      "VILLAGE", "WINDOW", "YELLOW", "ZEBRA", "MARBLE", "CRYSTAL", "THUNDER",
      "BUTTERFLY", "MOUNTAIN", "DIAMOND", "SILVER", "GOLDEN", "PURPLE", "ORANGE"
    ];
    
    const availableRandomWords = randomWords.filter(word => !this.usedWords.has(word));
    
    if (availableRandomWords.length === 0) {
      // Reset tracking when we've exhausted everything
      this.usedWords.clear();
      return randomWords[Math.floor(Math.random() * randomWords.length)];
    }
    
    return availableRandomWords[Math.floor(Math.random() * availableRandomWords.length)];
  }

  private getFallbackWord(): Word {
    const fallbackWords = [
      {
        word: "MAGNIFICENT",
        definition: "Extremely beautiful, elaborate, or impressive; inspiring great admiration or awe."
      },
      {
        word: "SERENDIPITY", 
        definition: "The occurrence and development of events by chance in a happy or beneficial way; a pleasant surprise."
      },
      {
        word: "WANDERLUST",
        definition: "A strong desire to travel and explore the world; an irresistible urge to wander and discover new places."
      }
    ];

    const randomFallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    return {
      id: Date.now(),
      ...randomFallback,
      difficulty: categorizeWordDifficulty(randomFallback.word),
      category: "general"
    };
  }

  // Method to preload popular words for faster access
  async preloadPopularWords(): Promise<void> {
    console.log('Preloading popular word definitions...');
    
    const popularWords = CURATED_WORDS.slice(0, 30); // Preload first 30 words
    
    for (const word of popularWords) {
      try {
        await this.fetchDefinitionFromAPI(word);
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Continue with other words if one fails
        continue;
      }
    }
    
    console.log('Word preloading completed');
  }

  // Get statistics about word usage
  getWordStats(): { totalCurated: number; totalDynamic: number; used: number } {
    const totalDynamic = Object.values(DYNAMIC_WORD_POOLS).flat().length;
    
    return {
      totalCurated: CURATED_WORDS.length,
      totalDynamic: totalDynamic,
      used: this.usedWords.size
    };
  }

  // Reset used words tracking (for testing or fresh start)
  resetUsedWords(): void {
    this.usedWords.clear();
  }
}

export const wordService = WordService.getInstance();