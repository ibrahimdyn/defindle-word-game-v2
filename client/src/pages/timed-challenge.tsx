import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Trophy, Target, Share2, Play, RotateCcw, Home, Info } from "lucide-react";
import { Link } from "wouter";
import type { Word, GameSession } from "@shared/schema";
import { playLetterRevealSound, playSuccessSound, playErrorSound, resumeAudioContext } from "@/lib/audio";
import { apiRequest } from "@/lib/queryClient";

type GameMode = '1min';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type GameState = 'setup' | 'playing' | 'finished';

interface GameStats {
  score: number;
  correctGuesses: number;
  totalWords: number;
  hintsUsed: number;
  timeRemaining: number;
}

export default function TimedChallenge() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('1min');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [playerName, setPlayerName] = useState('');
  
  // Game state
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [playerGuess, setPlayerGuess] = useState('');
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    correctGuesses: 0,
    totalWords: 0,
    hintsUsed: 0,
    timeRemaining: 0,
  });
  
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
  const [finalSession, setFinalSession] = useState<GameSession | null>(null);

  const queryClient = useQueryClient();

  // Fetch random word using enhanced API with authentic frequency rankings
  const { data: randomWord, refetch: fetchNewWord, isLoading } = useQuery<Word>({
    queryKey: ["/api/words/enhanced/difficulty", difficulty],
    queryFn: async () => {
      const endpoint = difficulty !== 'mixed' 
        ? `/api/words/enhanced/difficulty/${difficulty}` 
        : '/api/words/enhanced/random';
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch word: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });

  // Save game session
  const saveSessionMutation = useMutation({
    mutationFn: async (session: any) => {
      const response = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save game session');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setFinalSession(data);
    },
    onError: (error) => {
      console.error('Error saving game session:', error);
      // Still show results even if saving fails
      setFinalSession({
        id: Date.now(),
        playerName: playerName || 'Anonymous',
        mode: gameMode,
        difficulty,
        score: gameStats.score,
        correctGuesses: gameStats.correctGuesses,
        totalWords: gameStats.totalWords,
        hintsUsed: gameStats.hintsUsed,
        timeLimit: 60,
        completedAt: new Date().toISOString(),
      });
    }
  });

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && gameStats.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setGameStats(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && gameStats.timeRemaining === 0) {
      finishGame();
    }
  }, [gameState, gameStats.timeRemaining]);

  const startGame = useCallback(async () => {
    resumeAudioContext();
    
    const timeLimit = 60; // 1 minute in seconds
    
    setGameState('playing');
    setGameStats({
      score: 0,
      correctGuesses: 0,
      totalWords: 0,
      hintsUsed: 0,
      timeRemaining: timeLimit,
    });
    setShowResult(null);
    setFinalSession(null);
    
    await loadNextWord();
  }, [gameMode, difficulty]);

  const loadNextWord = useCallback(async () => {
    setRevealedIndices(new Set());
    setPlayerGuess('');
    setShowResult(null);
    
    const result = await fetchNewWord();
    if (result.data) {
      setCurrentWord(result.data);
      setGameStats(prev => ({ ...prev, totalWords: prev.totalWords + 1 }));
    }
  }, [fetchNewWord]);

  const revealLetter = useCallback(() => {
    if (!currentWord || gameState !== 'playing') return;
    
    const letters = currentWord.word.split('').filter(letter => letter !== ' ');
    const unrevealed = [];
    
    for (let i = 0; i < letters.length; i++) {
      if (!revealedIndices.has(i)) {
        unrevealed.push(i);
      }
    }
    
    if (unrevealed.length > 0) {
      const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setRevealedIndices(prev => new Set(Array.from(prev).concat([randomIndex])));
      setGameStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      playLetterRevealSound();
    }
  }, [currentWord, revealedIndices, gameState]);

  const checkGuess = useCallback(() => {
    if (!currentWord || !playerGuess.trim()) return;
    
    const guess = playerGuess.trim().toLowerCase();
    const answer = currentWord.word.toLowerCase().replace(/\s/g, '');
    
    if (guess === answer) {
      setShowResult('correct');
      playSuccessSound();
      
      // Calculate score: base points + time bonus - hint penalty
      const basePoints = getWordPoints(currentWord.difficulty || 'medium');
      const timeBonus = Math.floor(gameStats.timeRemaining / 10); // 1 point per 10 seconds remaining
      const hintPenalty = gameStats.hintsUsed * 5; // -5 points per hint used this round
      const roundScore = Math.max(basePoints + timeBonus - hintPenalty, 10); // minimum 10 points
      
      setGameStats(prev => ({
        ...prev,
        score: prev.score + roundScore,
        correctGuesses: prev.correctGuesses + 1,
      }));
      
      // Reveal all letters
      const allIndices = new Set<number>();
      for (let i = 0; i < currentWord.word.replace(/\s/g, '').length; i++) {
        allIndices.add(i);
      }
      setRevealedIndices(allIndices);
      
      // Load next word after 1.5 seconds
      setTimeout(() => {
        loadNextWord();
      }, 1500);
    } else {
      setShowResult('incorrect');
      playErrorSound();
      
      // Hide error after 1 second
      setTimeout(() => {
        setShowResult(null);
      }, 1000);
    }
  }, [currentWord, playerGuess, gameStats]);

  const finishGame = useCallback(() => {
    setGameState('finished');
    
    // Save session to database
    const session = {
      playerName: playerName || 'Anonymous',
      mode: gameMode,
      difficulty,
      score: gameStats.score,
      correctGuesses: gameStats.correctGuesses,
      totalWords: gameStats.totalWords,
      hintsUsed: gameStats.hintsUsed,
      timeLimit: 60,
      completedAt: new Date().toISOString(),
    };
    
    saveSessionMutation.mutate(session);
  }, [gameStats, gameMode, difficulty, playerName]);

  const getWordPoints = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 50;
      case 'medium': return 100;
      case 'hard': return 150;
      default: return 100;
    }
  };

  const shareResults = async () => {
    const accuracy = gameStats.totalWords > 0 ? Math.round((gameStats.correctGuesses / gameStats.totalWords) * 100) : 0;
    const text = `🎯 Word Challenge Results!\n\n⏱️ ${gameMode === '3min' ? '3' : '5'} minute challenge\n🎖️ Score: ${gameStats.score} points\n✅ Correct: ${gameStats.correctGuesses}/${gameStats.totalWords} (${accuracy}%)\n💡 Hints used: ${gameStats.hintsUsed}\n\nCan you beat my score? 🏆`;
    
    try {
      if (navigator.share && typeof navigator.canShare === 'function') {
        await navigator.share({
          title: 'Word Challenge Game Results',
          text: text,
          url: window.location.origin,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(text + `\n\nPlay at: ${window.location.origin}`);
        alert('Results copied to clipboard! Share them anywhere you like.');
      }
    } catch (error) {
      // Handle share cancellation or other errors gracefully
      if ((error as any)?.name === 'AbortError') {
        // User canceled - no need to show error
        return;
      }
      
      // Fallback to clipboard for other errors
      try {
        await navigator.clipboard.writeText(text + `\n\nPlay at: ${window.location.origin}`);
        alert('Results copied to clipboard! Share them anywhere you like.');
      } catch (clipboardError) {
        // Final fallback - show text in alert
        alert(`Copy your results:\n\n${text}\n\nPlay at: ${window.location.origin}`);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderWordDisplay = () => {
    if (!currentWord) return null;

    const letters = currentWord.word.split('').filter(letter => letter !== ' ');
    
    return (
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {letters.map((letter, index) => (
          <motion.div
            key={index}
            className="w-12 h-12 border-2 border-blue-300 rounded-lg flex items-center justify-center bg-white/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <span className="text-xl font-bold text-blue-900">
              {revealedIndices.has(index) ? letter.toUpperCase() : ''}
            </span>
          </motion.div>
        ))}
      </div>
    );
  };

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-4">⏱️ Timed Challenge</h1>
            <p className="text-white/80 text-lg">
              Test your vocabulary skills in a time-limited challenge!
            </p>
          </motion.div>

          <Card className="p-8 backdrop-blur-sm bg-white/10 border-white/20">
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">Player Name (Optional)</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Challenge Duration</label>
                <Select value={gameMode} onValueChange={(value: GameMode) => setGameMode(value)}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1min">1 Minute - Speed Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Difficulty Level</label>
                <Select value={difficulty} onValueChange={(value: Difficulty) => setDifficulty(value)}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy - Frequent words</SelectItem>
                    <SelectItem value="medium" disabled className="opacity-50">
                      <div className="flex items-center justify-between w-full">
                        <span>Medium - Standard vocabulary</span>
                        <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hard" disabled className="opacity-50">
                      <div className="flex items-center justify-between w-full">
                        <span>Hard - Advanced words</span>
                        <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mixed" disabled className="opacity-50">
                      <div className="flex items-center justify-between w-full">
                        <span>Mixed - All difficulty levels</span>
                        <span className="text-xs bg-orange-500/80 text-white px-2 py-1 rounded ml-2 font-medium">📱 Mobile Only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-gray-400 text-sm mt-2">
                  💡 Download our mobile app for challenging difficulty levels and enhanced features!
                </p>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="text-white font-bold mb-2">Scoring System:</h3>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Easy words: 50 points + time bonus</li>
                  <li>• Medium words: 100 points + time bonus</li>
                  <li>• Hard words: 150 points + time bonus</li>
                  <li>• Time bonus: 1 point per 10 seconds remaining</li>
                  <li>• Hint penalty: -5 points per hint used</li>
                </ul>
              </div>

              <Button
                onClick={startGame}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                <Play className="mr-2" />
                Start 1 Minute Speed Challenge
              </Button>

              <Link href="/">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const accuracy = gameStats.totalWords > 0 ? Math.round((gameStats.correctGuesses / gameStats.totalWords) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-4">🏆 Challenge Complete!</h1>
            <p className="text-white/80 text-lg">
              {gameMode === '3min' ? '3' : '5'} minute challenge finished
            </p>
          </motion.div>

          <Card className="p-8 backdrop-blur-sm bg-white/10 border-white/20">
            <div className="text-center space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-yellow-400">{gameStats.score}</div>
                  <div className="text-white/80">Total Score</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-400">{accuracy}%</div>
                  <div className="text-white/80">Accuracy</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{gameStats.correctGuesses}/{gameStats.totalWords}</div>
                  <div className="text-white/80">Correct Words</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{gameStats.hintsUsed}</div>
                  <div className="text-white/80">Hints Used</div>
                </div>
              </div>

              {/* Mobile App Conversion */}
              <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-xl p-6 border border-orange-400/30">
                <div className="text-center">
                  <div className="text-4xl mb-3">📱✨</div>
                  <h3 className="text-xl font-bold text-white mb-2">Ready for More Challenges?</h3>
                  <p className="text-orange-100 text-sm mb-4">
                    Download our mobile app for all difficulty levels, progress tracking, and unlimited speed challenges!
                  </p>
                  <div className="flex gap-2 justify-center text-xs text-orange-200 mb-4">
                    <span className="bg-orange-500/30 px-2 py-1 rounded">🏆 Progress Tracking</span>
                    <span className="bg-orange-500/30 px-2 py-1 rounded">🔥 Medium & Expert</span>
                    <span className="bg-orange-500/30 px-2 py-1 rounded">⚡ Unlimited Rounds</span>
                  </div>
                  <Button 
                    onClick={() => alert('Download our mobile app from the App Store or Google Play Store!')}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold px-6 py-2 rounded-lg text-sm"
                  >
                    📱 Get Mobile App
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={shareResults}
                  className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                >
                  <Share2 className="mr-2" />
                  Share Results
                </Button>
                
                <Button
                  onClick={() => setGameState('setup')}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <RotateCcw className="mr-2" />
                  Play Again
                </Button>
              </div>

              <Link href="/">
                <Button variant="outline" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Home className="mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header with timer and stats */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <Clock className="mr-1" />
              {formatTime(gameStats.timeRemaining)}
            </Badge>
            <Badge variant="outline" className="text-lg px-3 py-1 bg-white/10 border-white/30 text-white">
              <Trophy className="mr-1" />
              {gameStats.score}
            </Badge>
            <Badge variant="outline" className="text-lg px-3 py-1 bg-white/10 border-white/30 text-white">
              <Target className="mr-1" />
              {gameStats.correctGuesses}/{gameStats.totalWords}
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center backdrop-blur-sm bg-white/10 border-white/20">
            <div className="text-white text-lg">Loading next word...</div>
          </Card>
        ) : currentWord ? (
          <Card className="p-8 backdrop-blur-sm bg-white/10 border-white/20">
            {/* Definition */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Info className="text-blue-400" />
                <span className="text-white font-medium">Definition</span>
                {currentWord.difficulty && (
                  <Badge 
                    variant={currentWord.difficulty === 'easy' ? 'secondary' : 
                            currentWord.difficulty === 'hard' ? 'destructive' : 'default'}
                  >
                    {currentWord.difficulty}
                  </Badge>
                )}
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white text-lg leading-relaxed">
                  {currentWord.definition}
                </p>
              </div>
            </div>

            {/* Word display */}
            {renderWordDisplay()}

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={revealLetter}
                  disabled={revealedIndices.size >= currentWord.word.replace(/\s/g, '').length}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  💡 Give me a letter! (-5 pts)
                </Button>
                
                <Button
                  onClick={loadNextWord}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Skip Word
                </Button>
              </div>

              {/* Guess input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type your guess..."
                  value={playerGuess}
                  onChange={(e) => setPlayerGuess(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && checkGuess()}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
                <Button onClick={checkGuess} disabled={!playerGuess.trim()}>
                  Submit
                </Button>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {showResult === 'correct' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center"
                  >
                    <div className="text-green-400 text-xl font-bold">
                      🎉 Correct! Well done! 😊
                    </div>
                  </motion.div>
                )}
                {showResult === 'incorrect' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center"
                  >
                    <div className="text-red-400 text-xl font-bold">
                      😔 Try again! 💭
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center backdrop-blur-sm bg-white/10 border-white/20">
            <div className="text-white text-lg">Failed to load word. Please try again.</div>
          </Card>
        )}
      </div>
    </div>
  );
}