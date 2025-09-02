import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info, Clock, RotateCcw, BarChart3, User, History, Settings, Volume2, VolumeX, HelpCircle, BookOpen, Play, Target } from "lucide-react";
import { Link } from "wouter";
import type { Word } from "@shared/schema";
import { playLetterRevealSound, playSuccessSound, playErrorSound, resumeAudioContext } from "@/lib/audio";
import { usePersonalWordHistory } from "@/hooks/usePersonalWordHistory";

type GamePhase = "definition" | "reveal";
type Difficulty = "common" | "moderate" | "expert" | "mix";

export default function WordGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>("definition");
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [gameStarted, setGameStarted] = useState(false);
  const [playerGuess, setPlayerGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [guessResult, setGuessResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [maxGuesses] = useState(1); // Quest Mode: 1 attempt per word
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [totalWordsAttempted, setTotalWordsAttempted] = useState(0);
  const [hintsUsedThisWord, setHintsUsedThisWord] = useState(0);
  // Quest Mode: Unlimited hints with point penalties
  const [maxWordsPerSession] = useState(5); // 5 words per game session
  const [sessionComplete, setSessionComplete] = useState(false);
  const [correctWords, setCorrectWords] = useState(0);
  
  // Slot machine animation states
  const [isSlotMachineAnimating, setIsSlotMachineAnimating] = useState(false);
  const [animatingLetters, setAnimatingLetters] = useState<Map<number, string>>(new Map());
  const [maxHintsPerWord] = useState(2); // Maximum 2 hints per word
  const [totalHintsRemaining, setTotalHintsRemaining] = useState(10); // Total hint budget

  // Difficulty selection - Web app defaults to "common" (Easy)
  const [difficulty, setDifficulty] = useState<Difficulty>("common");
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('wordgame-sound-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [hintsEnabled, setHintsEnabled] = useState(() => {
    const saved = localStorage.getItem('wordgame-hints-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Personal word history integration
  const { 
    recordWordSeen, 
    getSmartWord, 
    seenWords, 
    deviceId, 
    isReturningUser 
  } = usePersonalWordHistory();

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('wordgame-sound-enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('wordgame-hints-enabled', JSON.stringify(hintsEnabled));
  }, [hintsEnabled]);

  const { data: randomWord, refetch: fetchNewWord, isLoading } = useQuery<Word>({
    queryKey: ["/api/words/enhanced/difficulty", difficulty],
    queryFn: async () => {
      // Map frontend difficulty names to backend API names
      const difficultyMap = {
        'common': 'easy',
        'moderate': 'medium', 
        'expert': 'hard',
        'mix': 'mixed'
      };
      
      const backendDifficulty = difficultyMap[difficulty];
      const endpoint = difficulty !== 'mix' 
        ? `/api/words/enhanced/difficulty/${backendDifficulty}` 
        : '/api/words/enhanced/random';
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch word: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });

  const startGame = useCallback(async () => {
    // Resume audio context on user interaction
    resumeAudioContext();
    
    // Check if session should complete before starting new word
    if (totalWordsAttempted >= maxWordsPerSession) {
      setSessionComplete(true);
      return;
    }
    
    setGameStarted(true);
    setGamePhase("definition");
    setRevealedIndices(new Set());
    setPlayerGuess('');
    setIsCorrect(false);
    setGuessResult(null);
    setHintCount(0);
    setWrongGuesses(0);
    setGameOver(false);
    setTotalWordsAttempted(prev => prev + 1);
    setHintsUsedThisWord(0);
    
    try {
      // Use smart word selection to avoid repetition with selected difficulty
      // Map frontend difficulty names to backend API names
      const difficultyMap = {
        'common': 'easy',
        'moderate': 'medium', 
        'expert': 'hard',
        'mix': 'mixed'
      };
      const backendDifficulty = difficultyMap[difficulty];
      const smartWordResult = await getSmartWord.mutateAsync(backendDifficulty);
      if (smartWordResult) {
        setCurrentWord(smartWordResult);
        
        // Record that user has seen this word
        await recordWordSeen.mutateAsync({
          word: smartWordResult.word,
          gameMode: 'normal'
        });
        
        // Auto-progress directly to reveal phase
        setTimeout(() => {
          setGamePhase("reveal");
        }, 200);
      } else {
        // Fallback to regular random word
        const result = await fetchNewWord();
        if (result.data) {
          setCurrentWord(result.data);
          await recordWordSeen.mutateAsync({
            word: result.data.word,
            gameMode: 'normal'
          });
          
          setTimeout(() => {
            setGamePhase("reveal");
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error getting smart word, falling back to random:', error);
      // Fallback to regular random word
      const result = await fetchNewWord();
      if (result.data) {
        setCurrentWord(result.data);
        setTimeout(() => {
          setGamePhase("reveal");
        }, 200);
      }
    }
  }, [fetchNewWord, getSmartWord, recordWordSeen]);

  const checkGuess = async () => {
    if (!currentWord || gameOver) return;
    
    const guess = playerGuess.trim().toLowerCase();
    const answer = currentWord.word.toLowerCase();
    
    if (guess === answer) {
      setIsCorrect(true);
      setGuessResult('correct');
      
      // New scoring: + (unrevealed letters × 100)
      const unrevealedLetters = currentWord.word.replace(/\s/g, '').length - revealedIndices.size;
      const finalPoints = unrevealedLetters * 100;
      
      setScore(prev => prev + finalPoints);
      setCorrectWords(prev => prev + 1);
      
      // Record successful guess
      await recordWordSeen.mutateAsync({
        word: currentWord.word,
        guessedCorrectly: 1,
        hintCount: hintCount,
        gameMode: 'normal'
      });
      
      // Play success sound
      if (soundEnabled) {
        playSuccessSound();
      }
      
      // Reveal all letters when correct
      const allIndices = new Set<number>();
      for (let i = 0; i < currentWord.word.replace(/\s/g, '').length; i++) {
        allIndices.add(i);
      }
      setRevealedIndices(allIndices);
      
      // Automatically move to next word after 2 seconds
      setTimeout(() => {
        // Check if session is complete
        if (totalWordsAttempted >= maxWordsPerSession) {
          setSessionComplete(true);
          return;
        }
        startGame();
      }, 2000);
    } else {
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      setGuessResult('incorrect');
      if (soundEnabled) {
        playErrorSound();
      }
      
      if (newWrongGuesses >= maxGuesses) {
        // Game over for this word - show correct answer
        setGameOver(true);
        setShowCorrectAnswer(true);
        
        // Record failed attempt
        await recordWordSeen.mutateAsync({
          word: currentWord.word,
          guessedCorrectly: 0,
          hintCount: hintCount,
          gameMode: 'normal'
        });
        
        // Calculate penalty before animation
        const unrevealedLetters = currentWord.word.replace(/\s/g, '').length - revealedIndices.size;
        const penalty = unrevealedLetters * 100;
        setScore(prev => prev - penalty);
        
        // Start slot machine animation for unrevealed letters
        await startSlotMachineAnimation();
        
        // Check if this was the last word after animation completes
        if (totalWordsAttempted >= maxWordsPerSession) {
          // Show "Session is Completed" message briefly before final screen
          setTimeout(() => {
            setShowCorrectAnswer(false);
            setSessionComplete(true);
          }, 2000);
        } else {
          // Show answer for 2 seconds after animation, then move to next word
          setTimeout(() => {
            setShowCorrectAnswer(false);
            startGame();
          }, 2000);
        }
      } else {
        // Allow another guess
        setTimeout(() => {
          setGuessResult(null);
          setPlayerGuess('');
        }, 1500);
      }
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkGuess();
  };

  const revealNextLetter = () => {
    if (!currentWord) return;
    
    // Check if hints are disabled
    if (!hintsEnabled) {
      return;
    }
    
    // Unlimited hints in Quest Mode
    
    const letters = currentWord.word.split('').filter(letter => letter !== ' ');
    const unrevealed = [];
    
    for (let i = 0; i < letters.length; i++) {
      if (!revealedIndices.has(i)) {
        unrevealed.push(i);
      }
    }
    
    if (unrevealed.length > 0) {
      const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      const newRevealedIndices = new Set(Array.from(revealedIndices).concat(randomIndex));
      setRevealedIndices(newRevealedIndices);
      setHintCount(prev => prev + 1);
      setHintsUsedThisWord(prev => prev + 1);
      
      // Apply hint penalty: -100 points per letter
      setScore(prev => prev - 100);
      
      // Play sound effect when letter is revealed
      if (soundEnabled) {
        playLetterRevealSound();
      }
      
      // Check if all letters are now revealed
      if (newRevealedIndices.size >= letters.length) {
        // Record word as seen with hints
        recordWordSeen.mutateAsync({
          word: currentWord.word,
          guessedCorrectly: 0,
          hintCount: hintCount + 1,
          gameMode: 'normal'
        });
        
        // Check if session is complete
        if (totalWordsAttempted >= maxWordsPerSession) {
          setSessionComplete(true);
          return;
        }
        
        // Auto-advance to next word after a short delay
        setTimeout(() => {
          startGame();
        }, 2000);
      }
    }
  };

  const skipWord = () => {
    startGame();
  };

  // Slot machine animation function
  const startSlotMachineAnimation = async () => {
    if (!currentWord) return;
    
    setIsSlotMachineAnimating(true);
    
    // Get unrevealed letter indices
    const letters = currentWord.word.split('').filter(letter => letter !== ' ');
    const unrevealedIndices: number[] = [];
    
    for (let i = 0; i < letters.length; i++) {
      if (!revealedIndices.has(i)) {
        unrevealedIndices.push(i);
      }
    }
    
    if (unrevealedIndices.length === 0) {
      setIsSlotMachineAnimating(false);
      return;
    }
    
    // Alphabet for random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Animate each unrevealed letter position
    const animationPromises = unrevealedIndices.map(async (letterIndex, delay) => {
      return new Promise<void>((resolve) => {
        let cycleCount = 0;
        const maxCycles = 20 + (delay * 5); // Different timing for each letter
        
        const interval = setInterval(() => {
          // Show random letter
          const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
          setAnimatingLetters(prev => new Map(prev).set(letterIndex, randomLetter));
          
          // Play rapid sound effect for slot machine feel
          if (soundEnabled && cycleCount % 3 === 0) {
            playLetterRevealSound();
          }
          
          cycleCount++;
          
          if (cycleCount >= maxCycles) {
            clearInterval(interval);
            // Reveal the correct letter
            const correctLetter = letters[letterIndex];
            setAnimatingLetters(prev => new Map(prev).set(letterIndex, correctLetter));
            
            // Add to revealed indices
            setRevealedIndices(prev => new Set(prev).add(letterIndex));
            
            // Final sound for this letter
            if (soundEnabled) {
              setTimeout(() => playSuccessSound(), 100);
            }
            
            resolve();
          }
        }, 50 + (cycleCount * 2)); // Gradually slow down
      });
    });
    
    // Wait for all animations to complete
    await Promise.all(animationPromises);
    
    // Clear animating letters and end animation
    setAnimatingLetters(new Map());
    setIsSlotMachineAnimating(false);
  };





  const resetGame = () => {
    setGameStarted(false);
    setGamePhase("definition");
    setRevealedIndices(new Set());
    setCurrentWord(null);
    setScore(0);
    setTotalWordsAttempted(0);
    // No hint budget to reset in Quest Mode
    setHintsUsedThisWord(0);
    setSessionComplete(false);
    setCorrectWords(0);
  };

  const renderWordDisplay = () => {
    if (!currentWord) return null;
    
    const letters = currentWord.word.split('');
    return (
      <div className="flex justify-center items-center gap-2 min-h-[80px] flex-wrap">
        {letters.map((letter, index) => {
          const letterIndex = letters.slice(0, index).filter(l => l !== ' ').length;
          const isRevealed = revealedIndices.has(letterIndex);
          const isAnimating = animatingLetters.has(letterIndex);
          const animatingLetter = animatingLetters.get(letterIndex);
          
          if (letter === ' ') {
            return <div key={index} className="w-4 h-16" />;
          }
          
          return (
            <motion.div
              key={index}
              className={`w-12 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                isRevealed 
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' 
                  : isAnimating
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400 animate-pulse'
                  : 'bg-white/10 border-white/20 text-white/50'
              }`}
              initial={false}
              animate={
                isRevealed 
                  ? { rotateY: [90, 0], scale: [0.8, 1.1, 1] } 
                  : isAnimating 
                  ? { scale: [1, 1.1, 1] } 
                  : {}
              }
              transition={{ duration: isAnimating ? 0.1 : 0.8, ease: "easeOut" }}
            >
              {isRevealed ? letter : isAnimating ? animatingLetter : '_'}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const progress = currentWord ? (revealedIndices.size / currentWord.word.replace(/\s/g, '').length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <motion.div 
          className="absolute top-10 left-10 w-20 h-20 bg-indigo-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-32 right-16 w-16 h-16 bg-amber-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
        <motion.div 
          className="absolute bottom-20 left-20 w-12 h-12 bg-purple-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 2 }}
        />
        <motion.div 
          className="absolute bottom-32 right-10 w-14 h-14 bg-emerald-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
      </div>


      {/* Main Game Container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl mx-auto">

          
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-8 shadow-2xl">
            {/* Settings Panel */}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              >
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Game Settings
                </h3>
                
                <div className="space-y-4">
                  {/* Sound Settings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                      <div>
                        <p className="text-white font-medium">Sound Effects</p>
                        <p className="text-gray-400 text-sm">Play sounds for hints and feedback</p>
                      </div>
                    </div>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>
                  
                  {/* Hints Settings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Hints System</p>
                        <p className="text-gray-400 text-sm">Enable/disable hint functionality</p>
                      </div>
                    </div>
                    <Switch
                      checked={hintsEnabled}
                      onCheckedChange={setHintsEnabled}
                    />
                  </div>
                </div>
                
                <Button
                  onClick={() => setShowSettings(false)}
                  className="mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  size="sm"
                >
                  Close Settings
                </Button>
              </motion.div>
            )}

            {/* Game Stats Header */}
            {gameStarted && (
              <div className="flex justify-between items-center mb-6 text-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="bg-blue-500/20 border border-blue-400/30 text-blue-300 px-3 py-1 rounded-full">
                    Score: {score}
                  </div>
                  <div className="bg-purple-500/20 border border-purple-400/30 text-purple-300 px-3 py-1 rounded-full">
                    Words: {totalWordsAttempted}/{maxWordsPerSession}
                  </div>
                </div>
              </div>
            )}

            {/* Definition - Always Visible */}
            {currentWord && !sessionComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center space-y-4 mb-8"
              >
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium">
                  <Info className="w-5 h-5" />
                  Definition
                  {currentWord?.difficulty && (
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      currentWord.difficulty === 'easy' ? 'bg-green-500/30 text-green-200' :
                      currentWord.difficulty === 'medium' ? 'bg-yellow-500/30 text-yellow-200' :
                      currentWord.difficulty === 'hard' ? 'bg-red-500/30 text-red-200' :
                      'bg-gray-500/30 text-gray-200'
                    }`}>
                      {currentWord.difficulty === 'easy' ? 'Common' :
                       currentWord.difficulty === 'medium' ? 'Moderate' :
                       currentWord.difficulty === 'hard' ? 'Expert' : currentWord.difficulty}
                    </span>
                  )}
                </div>
                
                <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-6 border border-white/10">
                  <p className="text-lg leading-relaxed text-gray-100 font-medium">
                    {currentWord.definition}
                  </p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* Phase 1: Definition Display - Now just shows initial state */}
              {gamePhase === "definition" && currentWord && !sessionComplete && (
                <motion.div
                  key="definition"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  {/* Empty div for smooth transition timing */}
                </motion.div>
              )}





              {/* Phase 2: Word Reveal */}
              {gamePhase === "reveal" && !sessionComplete && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-center space-y-8"
                >
                  <div className="space-y-6">
                    {renderWordDisplay()}
                    
                    {/* Progress Indicator */}
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-500 to-amber-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    {/* Keyboard Input */}
                    {!isCorrect && !gameOver && (
                      <form onSubmit={handleGuessSubmit} className="flex gap-3 justify-center max-w-md mx-auto">
                        <input
                          type="text"
                          value={playerGuess}
                          onChange={(e) => setPlayerGuess(e.target.value.toUpperCase())}
                          placeholder="Type your guess..."
                          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          maxLength={currentWord?.word.length}
                        />
                        <Button 
                          type="submit"
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                        >
                          Guess
                        </Button>
                      </form>
                    )}

                    {/* Action Buttons */}
                    {!isCorrect && !gameOver && (
                      <div className="flex gap-4 justify-center">
                        {currentWord && revealedIndices.size < currentWord.word.replace(/\s/g, '').length && (
                          <Button 
                            onClick={revealNextLetter}
                            disabled={!hintsEnabled}
                            className={`font-semibold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 ${
                              !hintsEnabled
                                ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                            }`}
                          >
                            {!hintsEnabled
                              ? 'Hints disabled'
                              : `Reveal Letter (-100 pts)`
                            }
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Feedback messages with emojis */}
                    {guessResult === 'correct' && (
                      <motion.div 
                        className="text-center"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <div className="inline-flex flex-col items-center gap-2 bg-emerald-500/20 text-emerald-400 px-6 py-4 rounded-2xl font-medium">
                          <div className="text-4xl">😊🎉</div>
                          <div className="text-lg">Excellent! Well done!</div>
                        </div>
                      </motion.div>
                    )}
                    
                    
                    {gameOver && (
                      <motion.div 
                        className="text-center"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <div className={`inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl font-medium ${
                          totalWordsAttempted >= maxWordsPerSession 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          <div className="text-4xl">
                            {totalWordsAttempted >= maxWordsPerSession ? '🎉✨' : '❌📝'}
                          </div>
                          <div className={`text-sm ${
                            totalWordsAttempted >= maxWordsPerSession ? 'text-emerald-300' : 'text-red-300'
                          }`}>
                            {totalWordsAttempted >= maxWordsPerSession ? 'Session is Completed!' : 'Moving to next word...'}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Session Complete Screen */}
            {sessionComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 mt-8"
              >
                <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl p-8 border border-white/10">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-white mb-4">Session Complete!</h2>
                  <p className="text-white/80 text-lg mb-6">
                    5-word challenge finished
                  </p>
                  
                  <div className="space-y-4 text-lg">
                    <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                      <span className="text-gray-300">Words Attempted:</span>
                      <span className="text-white font-bold">{totalWordsAttempted}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                      <span className="text-gray-300">Words Correct:</span>
                      <span className="text-emerald-400 font-bold">{correctWords}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                      <span className="text-gray-300">Accuracy:</span>
                      <span className="text-blue-400 font-bold">
                        {totalWordsAttempted > 0 ? Math.round((correctWords / totalWordsAttempted) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                      <span className="text-gray-300">Final Score:</span>
                      <span className="text-yellow-400 font-bold text-2xl">{score}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 rounded-xl p-4">
                      <span className="text-gray-300">Hints Used:</span>
                      <span className="text-purple-400 font-bold">{hintCount}</span>
                    </div>
                  </div>

                  {/* Mobile App Conversion */}
                  <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-xl p-6 border border-orange-400/30 mt-6">
                    <div className="text-center">
                      <div className="text-4xl mb-3">📱✨</div>
                      <h3 className="text-xl font-bold text-white mb-2">Want More Challenges?</h3>
                      <p className="text-orange-100 text-sm mb-4">
                        Download our mobile app for unlimited quests, all difficulty levels, progress tracking, and exclusive features!
                      </p>
                      <div className="flex gap-2 justify-center text-xs text-orange-200 mb-4">
                        <span className="bg-orange-500/30 px-2 py-1 rounded">🏆 Progress Tracking</span>
                        <span className="bg-orange-500/30 px-2 py-1 rounded">🔥 All Difficulties</span>
                        <span className="bg-orange-500/30 px-2 py-1 rounded">✨ Unlimited Quests</span>
                      </div>
                      <Button 
                        onClick={() => alert('Download our mobile app from the App Store or Google Play Store!')}
                        className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold px-6 py-2 rounded-lg text-sm"
                      >
                        📱 Get Mobile App
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 justify-center mt-6">
                    <Button 
                      onClick={resetGame}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      Play Again
                    </Button>
                    <Button 
                      onClick={async () => {
                        const results = `🎯 Word Game Results!\n\nWords Attempted: ${totalWordsAttempted}\nWords Correct: ${correctWords}\nAccuracy: ${totalWordsAttempted > 0 ? Math.round((correctWords / totalWordsAttempted) * 100) : 0}%\nFinal Score: ${score}\n\nCan you beat my score? Try the word game at: ${window.location.origin}`;
                        
                        // Use Web Share API if available (mobile/modern browsers)
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'My Word Game Results!',
                              text: results,
                              url: window.location.origin
                            });
                            return;
                          } catch (err) {
                            // User cancelled or share failed, fall back to other methods
                            console.log('Share cancelled or failed, trying clipboard');
                          }
                        }
                        
                        // Try clipboard as fallback
                        try {
                          await navigator.clipboard.writeText(results);
                          // Show temporary feedback
                          const button = document.activeElement as HTMLElement;
                          const originalText = button.textContent;
                          button.textContent = 'Copied!';
                          setTimeout(() => {
                            button.textContent = originalText;
                          }, 2000);
                        } catch (err) {
                          // Final fallback - show results in alert for manual sharing
                          alert('Share your results:\n\n' + results);
                        }
                      }}
                      variant="outline"
                      className="border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      Share Results
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Setup Phase */}
            {!gameStarted && !sessionComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-4 mb-4"
                  >
                    <BookOpen className="h-10 w-10 text-teal-400" />
                    <h1 className="text-4xl font-bold text-white">Quest Mode</h1>
                  </motion.div>
                  <p className="text-lg text-gray-300">
                    Practice vocabulary with 5 carefully selected words. Take your time and learn!
                  </p>
                </div>

                {/* Game Description Card */}
                <Card className="bg-black/40 border-white/20 backdrop-blur-lg">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                      <Play className="h-6 w-6 text-teal-400" />
                      How to Play
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Perfect for focused vocabulary practice and learning new words
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Game Features */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-teal-500/20 border border-teal-400/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-teal-400">5</div>
                        <div className="text-sm text-gray-300">Words</div>
                      </div>
                      <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-400">1</div>
                        <div className="text-sm text-gray-300">Attempt</div>
                      </div>
                      <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">∞</div>
                        <div className="text-sm text-gray-300">Hints</div>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-400">-100</div>
                        <div className="text-sm text-gray-300">Per Hint</div>
                      </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white font-medium mb-2">Difficulty Level</label>
                        <Select value={difficulty} onValueChange={(value: Difficulty) => setDifficulty(value)}>
                          <SelectTrigger className="bg-white/20 border-white/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Easy - Frequent words</SelectItem>
                            <SelectItem value="moderate" disabled className="opacity-50">
                              <div className="flex items-center justify-between w-full">
                                <span>Moderate - Standard vocabulary</span>
                                <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="expert" disabled className="opacity-50">
                              <div className="flex items-center justify-between w-full">
                                <span>Expert - Advanced words</span>
                                <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="mix" disabled className="opacity-50">
                              <div className="flex items-center justify-between w-full">
                                <span>Mix - All difficulty levels</span>
                                <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-gray-400 text-sm mt-2">
                          💡 Download our mobile app for targeted difficulty levels and enhanced features!
                        </p>
                      </div>
                    </div>

                    {/* Gameplay Instructions */}
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-white/10">
                      <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" />
                        How It Works
                      </h3>
                      <div className="space-y-3 text-gray-300">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-teal-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm">Read the definition and guess the hidden word</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm">You have one attempt per word - make it count!</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm">Use unlimited hints to reveal letters (-100 points each)</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm">Wrong answers reveal all letters with exciting slot machine animation</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                          <p className="text-sm">Build your vocabulary and achieve the highest score possible!</p>
                        </div>
                      </div>
                    </div>

                    {/* Settings Toggle */}
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                      >
                        <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Game Settings
                        </h3>
                        
                        <div className="space-y-4">
                          {/* Sound Settings */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                              <div>
                                <p className="text-white font-medium">Sound Effects</p>
                                <p className="text-gray-400 text-sm">Play sounds for hints and feedback</p>
                              </div>
                            </div>
                            <Switch
                              checked={soundEnabled}
                              onCheckedChange={setSoundEnabled}
                            />
                          </div>
                          
                          {/* Hints Settings */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <HelpCircle className="w-5 h-5 text-blue-400" />
                              <div>
                                <p className="text-white font-medium">Hints System</p>
                                <p className="text-gray-400 text-sm">Enable/disable hint functionality</p>
                              </div>
                            </div>
                            <Switch
                              checked={hintsEnabled}
                              onCheckedChange={setHintsEnabled}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button 
                        onClick={startGame}
                        disabled={isLoading}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
                      >
                        <Play className="mr-2" />
                        {isLoading ? "Loading..." : "Start Quest Mode"}
                      </Button>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowSettings(!showSettings)}
                          variant="outline"
                          className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          {showSettings ? 'Hide Settings' : 'Settings'}
                        </Button>
                        
                        <Link href="/">
                          <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                            <User className="mr-2 h-4 w-4" />
                            Back to Home
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            {/* In-Game Reset Button */}
            {gameStarted && !sessionComplete && (
              <div className="text-center mt-6">
                <Button 
                  onClick={resetGame}
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold py-2 px-4 rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}