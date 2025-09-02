import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Trophy, Target, Share2, Play, Home, Info, Clock } from "lucide-react";
import { Link } from "wouter";
import type { Word } from "@shared/schema";
import { playLetterRevealSound, playSuccessSound, playErrorSound, resumeAudioContext } from "@/lib/audio";
import { usePersonalWordHistory } from "@/hooks/usePersonalWordHistory";

type GamePhase = "setup" | "definition" | "reveal" | "complete";

export default function DailyChallenge() {
  const [gamePhase, setGamePhase] = useState<GamePhase>("setup");
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [playerGuess, setPlayerGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(2); // Daily Challenge: 2 attempts
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const { recordWordSeen, getSmartWord } = usePersonalWordHistory();

  // Check if daily challenge was already completed today
  const checkDailyCompletion = useCallback(() => {
    const today = new Date().toDateString();
    const lastCompleted = localStorage.getItem('daily-challenge-completed');
    return lastCompleted === today;
  }, []);

  // Mark daily challenge as completed
  const markDailyCompleted = useCallback(() => {
    const today = new Date().toDateString();
    localStorage.setItem('daily-challenge-completed', today);
  }, []);

  // Get today's streak
  const getDailyStreak = useCallback(() => {
    const savedStreak = localStorage.getItem('daily-streak');
    return savedStreak ? parseInt(savedStreak) : 0;
  }, []);

  // Update daily streak
  const updateDailyStreak = useCallback((won: boolean) => {
    const currentStreak = getDailyStreak();
    const newStreak = won ? currentStreak + 1 : 0;
    localStorage.setItem('daily-streak', newStreak.toString());
    setStreak(newStreak);
  }, [getDailyStreak]);

  // Initialize game
  useEffect(() => {
    if (checkDailyCompletion()) {
      setIsCompleted(true);
      setStreak(getDailyStreak());
    } else {
      setStreak(getDailyStreak());
    }
  }, [checkDailyCompletion, getDailyStreak]);

  // Start daily challenge
  const startChallenge = useCallback(async () => {
    resumeAudioContext();
    
    if (checkDailyCompletion()) {
      setIsCompleted(true);
      return;
    }

    setGamePhase("definition");
    setRevealedIndices(new Set());
    setPlayerGuess('');
    setAttempts(0);
    setGameResult(null);
    
    try {
      // Get a challenging word for daily challenge
      const smartWordResult = await getSmartWord.mutateAsync('expert');
      if (smartWordResult) {
        setCurrentWord(smartWordResult);
        
        // Record that user has seen this word
        await recordWordSeen.mutateAsync({
          word: smartWordResult.word,
          gameMode: 'daily_challenge'
        });
        
        // Auto-progress to reveal phase
        setTimeout(() => {
          setGamePhase("reveal");
        }, 3000);
      }
    } catch (error) {
      console.error('Error getting word for daily challenge:', error);
    }
  }, [checkDailyCompletion, getSmartWord, recordWordSeen]);

  // Check player's guess
  const checkGuess = useCallback(async () => {
    if (!currentWord || gameResult) return;
    
    const guess = playerGuess.trim().toLowerCase();
    const answer = currentWord.word.toLowerCase();
    
    if (guess === answer) {
      // Correct answer
      setGameResult('won');
      setScore(100); // Fixed score for daily challenge
      playSuccessSound();
      
      // Reveal all letters
      const allIndices = new Set<number>();
      for (let i = 0; i < currentWord.word.replace(/\s/g, '').length; i++) {
        allIndices.add(i);
      }
      setRevealedIndices(allIndices);
      
      // Update streak and completion
      updateDailyStreak(true);
      markDailyCompleted();
      
      // Record successful attempt
      await recordWordSeen.mutateAsync({
        word: currentWord.word,
        guessedCorrectly: 1,
        hintCount: 0,
        gameMode: 'daily_challenge'
      });
      
      setTimeout(() => {
        setGamePhase("complete");
      }, 2000);
      
    } else {
      // Wrong answer
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      playErrorSound();
      
      if (newAttempts >= maxAttempts) {
        // Game over
        setGameResult('lost');
        updateDailyStreak(false);
        markDailyCompleted();
        
        // Record failed attempt
        await recordWordSeen.mutateAsync({
          word: currentWord.word,
          guessedCorrectly: 0,
          hintCount: 0,
          gameMode: 'daily_challenge'
        });
        
        setTimeout(() => {
          setGamePhase("complete");
        }, 2000);
      } else {
        // Clear input for next attempt
        setTimeout(() => {
          setPlayerGuess('');
        }, 1000);
      }
    }
  }, [currentWord, playerGuess, attempts, maxAttempts, gameResult, updateDailyStreak, markDailyCompleted, recordWordSeen]);

  // Render word display
  const renderWordDisplay = () => {
    if (!currentWord) return null;
    
    const letters = currentWord.word.split('');
    return (
      <div className="flex justify-center items-center gap-2 min-h-[80px] flex-wrap">
        {letters.map((letter, index) => {
          const letterIndex = letters.slice(0, index).filter(l => l !== ' ').length;
          const isRevealed = revealedIndices.has(letterIndex);
          
          if (letter === ' ') {
            return <div key={index} className="w-4 h-16" />;
          }
          
          return (
            <motion.div
              key={index}
              className={`w-12 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-500 ${
                isRevealed 
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' 
                  : 'bg-white/10 border-white/20 text-white/50'
              }`}
              initial={false}
              animate={isRevealed ? { rotateY: [90, 0], scale: [0.8, 1.1, 1] } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {isRevealed ? letter : '_'}
            </motion.div>
          );
        })}
      </div>
    );
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 border-white/20 backdrop-blur-lg">
          <CardHeader className="text-center">
            <Calendar className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <CardTitle className="text-2xl text-white">Daily Challenge Complete!</CardTitle>
            <CardDescription className="text-gray-300">
              You've already completed today's challenge. Come back tomorrow for a new word!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">{streak}</div>
              <div className="text-sm text-gray-400">Day Streak</div>
            </div>
            <Link href="/">
              <Button className="w-full" variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mb-4"
          >
            <Calendar className="h-10 w-10 text-emerald-400" />
            <h1 className="text-4xl font-bold text-white">Daily Challenge</h1>
          </motion.div>
          <p className="text-lg text-gray-300">
            One word, one chance, one day. Can you solve today's challenge?
          </p>
          
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Trophy className="w-4 h-4 mr-1" />
              Streak: {streak}
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Target className="w-4 h-4 mr-1" />
              {maxAttempts} Attempts
            </Badge>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Setup Phase */}
          {gamePhase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-black/40 border-white/20 backdrop-blur-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
                    <Calendar className="h-6 w-6 text-emerald-400" />
                    Today's Challenge
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Solve today's word with only {maxAttempts} attempts. Build your daily streak!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button 
                    onClick={startChallenge}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                  >
                    <Play className="mr-2" />
                    Start Daily Challenge
                  </Button>

                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      <Home className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Definition Phase */}
          {gamePhase === "definition" && currentWord && (
            <motion.div
              key="definition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-black/40 border-white/20 backdrop-blur-lg">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
                      <Info className="w-5 h-5" />
                      Definition
                    </div>
                    
                    <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl p-6 border border-white/10">
                      <p className="text-lg leading-relaxed text-gray-100 font-medium">
                        {currentWord.definition}
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      Read carefully... you only get {maxAttempts} attempts!
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Reveal Phase */}
          {gamePhase === "reveal" && currentWord && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-black/40 border-white/20 backdrop-blur-lg">
                <CardContent className="p-8 space-y-8">
                  
                  {/* Definition - Always Visible */}
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
                      <Info className="w-5 h-5" />
                      Definition
                    </div>
                    
                    <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl p-6 border border-white/10">
                      <p className="text-lg leading-relaxed text-gray-100 font-medium">
                        {currentWord.definition}
                      </p>
                    </div>
                  </div>

                  {/* Word Display */}
                  <div className="space-y-6">
                    {renderWordDisplay()}
                    
                    {/* Attempts Counter */}
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm font-medium">
                        <Target className="w-4 h-4" />
                        Attempts: {attempts}/{maxAttempts}
                      </div>
                    </div>

                    {/* Input and Submit */}
                    {!gameResult && (
                      <div className="space-y-4">
                        <Input
                          type="text"
                          value={playerGuess}
                          onChange={(e) => setPlayerGuess(e.target.value)}
                          placeholder="Enter your guess..."
                          className="text-center text-xl font-bold py-6 bg-white/10 border-white/20 text-white placeholder-gray-400"
                          onKeyPress={(e) => e.key === 'Enter' && checkGuess()}
                          disabled={!!gameResult}
                        />
                        
                        <Button
                          onClick={checkGuess}
                          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                          disabled={!playerGuess.trim() || !!gameResult}
                        >
                          Submit Guess
                        </Button>
                      </div>
                    )}

                    {/* Result Feedback */}
                    {gameResult === 'won' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-4"
                      >
                        <div className="text-4xl">🎉</div>
                        <div className="text-2xl font-bold text-emerald-400">Correct!</div>
                        <div className="text-gray-300">Great job! Your streak continues!</div>
                      </motion.div>
                    )}
                    
                    {gameResult === 'lost' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-4"
                      >
                        <div className="text-4xl">😔</div>
                        <div className="text-2xl font-bold text-red-400">Better luck tomorrow!</div>
                        <div className="bg-blue-500/20 rounded-lg border border-blue-400/30 p-4 space-y-2">
                          <div className="text-blue-400 text-lg">The answer was:</div>
                          <div className="text-2xl font-bold text-white">{currentWord.word}</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Complete Phase */}
          {gamePhase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-black/40 border-white/20 backdrop-blur-lg">
                <CardHeader className="text-center">
                  <div className="text-6xl mb-4">
                    {gameResult === 'won' ? '🎉' : '📚'}
                  </div>
                  <CardTitle className="text-3xl text-white">
                    {gameResult === 'won' ? 'Challenge Complete!' : 'Try Again Tomorrow!'}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {gameResult === 'won' 
                      ? `Great job! You solved today's word in ${attempts + 1} attempt${attempts === 0 ? '' : 's'}.`
                      : 'Don\'t worry, there\'s always tomorrow for a fresh challenge!'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">{streak}</div>
                      <div className="text-sm text-gray-400">Day Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{gameResult === 'won' ? score : 0}</div>
                      <div className="text-sm text-gray-400">Points</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link href="/">
                      <Button className="w-full" variant="outline">
                        <Home className="mr-2 h-4 w-4" />
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}