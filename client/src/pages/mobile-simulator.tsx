import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Info, Zap } from "lucide-react";
import { Link } from "wouter";
import type { Word } from "@shared/schema";
import { playLetterRevealSound, playSuccessSound, playErrorSound, resumeAudioContext } from "@/lib/audio";

type GamePhase = "definition" | "reveal";

export default function MobileSimulator() {
  const [gamePhase, setGamePhase] = useState<GamePhase>("definition");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [guess, setGuess] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const { data: currentWord, refetch, isLoading } = useQuery({
    queryKey: ["/api/words/random"],
  });

  const progress = currentWord 
    ? Math.round((revealedIndices.size / currentWord.word.replace(/\s/g, '').length) * 100)
    : 0;

  const loadNewWord = useCallback(() => {
    resumeAudioContext();
    setGamePhase("definition");
    setRevealedIndices(new Set());
    setGuess("");
    setIsCorrect(false);
    setShowSuccess(false);
    setShowError(false);
    refetch();
  }, [refetch]);

  const checkGuess = useCallback(() => {
    if (!currentWord || !guess.trim()) return;

    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedWord = currentWord.word.toLowerCase().replace(/\s/g, '');

    if (normalizedGuess === normalizedWord) {
      setIsCorrect(true);
      setShowSuccess(true);
      playSuccessSound();
      
      const allIndices = new Set(
        Array.from({ length: currentWord.word.replace(/\s/g, '').length }, (_, i) => i)
      );
      setRevealedIndices(allIndices);
      
      setTimeout(() => {
        loadNewWord();
      }, 3000);
    } else {
      setShowError(true);
      playErrorSound();
      setTimeout(() => setShowError(false), 2000);
    }
  }, [currentWord, guess, loadNewWord]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkGuess();
  };

  const revealNextLetter = () => {
    if (!currentWord) return;
    
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
      playLetterRevealSound();
      
      // Check if all letters are now revealed
      if (newRevealedIndices.size >= letters.length) {
        // Auto-advance to next word after a short delay
        setTimeout(() => {
          loadNewWord();
        }, 2000);
      }
    }
  };

  const renderWordDisplay = () => {
    if (!currentWord) return null;

    return (
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {currentWord.word.split('').map((letter, index) => {
          if (letter === ' ') {
            return <div key={index} className="w-4" />;
          }
          
          const letterIndex = currentWord.word.slice(0, index).replace(/\s/g, '').length;
          const isRevealed = revealedIndices.has(letterIndex);
          
          return (
            <motion.div
              key={index}
              className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center text-xl font-bold transition-all duration-300 ${
                isRevealed 
                  ? "bg-emerald-400/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-400/20" 
                  : "bg-white/5 border-white/10 text-white/30"
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {isRevealed ? letter : "_"}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Start with first word on mount
  useEffect(() => {
    loadNewWord();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background Elements - Same as web version */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-20 left-10 w-20 h-20 bg-cyan-500 rounded-full"
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

      {/* Mobile Frame */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm mx-auto">
          {/* Phone Frame */}
          <div className="bg-black rounded-[2.5rem] p-2 shadow-2xl">
            <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-[2rem] overflow-hidden relative">
              {/* Same animated background inside phone */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                  className="absolute top-10 left-5 w-8 h-8 bg-cyan-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute top-16 right-8 w-6 h-6 bg-amber-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <motion.div 
                  className="absolute bottom-10 left-10 w-5 h-5 bg-purple-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                />
                <motion.div 
                  className="absolute bottom-16 right-5 w-7 h-7 bg-emerald-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>

              {/* Status Bar */}
              <div className="h-6 bg-black flex items-center justify-between px-6 text-white text-xs relative z-10">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white rounded-sm">
                    <div className="w-3 h-1 bg-white rounded-sm m-0.5"></div>
                  </div>
                </div>
              </div>

              {/* App Content */}
              <div className="h-[640px] flex flex-col relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <Link href="/word-game">
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white/80 hover:bg-white/10 p-2">
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </Link>
                  <h1 className="text-lg font-bold text-white">Word Game</h1>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadNewWord}
                    className="text-white/60 hover:text-white/80 hover:bg-white/10 p-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {/* Loading */}
                    {isLoading && (
                      <motion.div 
                        className="flex-1 flex flex-col items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div 
                          className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p className="text-white/70 text-sm mt-4">Loading new word...</p>
                      </motion.div>
                    )}

                    {/* Game Content - Same as web version */}
                    {!isLoading && currentWord && (
                      <motion.div
                        key="game"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col"
                      >
                        <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-6 shadow-2xl mb-6">
                          {/* Definition - Always Visible */}
                          <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center space-y-4 mb-8"
                          >
                            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium">
                              <Info className="w-4 h-4" />
                              Definition
                            </div>
                            
                            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-4 border border-white/10">
                              <p className="text-base leading-relaxed text-gray-100 font-medium">
                                {currentWord.definition}
                              </p>
                            </div>
                          </motion.div>

                          {/* Word Display - Always Visible */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            {renderWordDisplay()}
                          </motion.div>

                          {/* Progress Bar */}
                          <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                            <motion.div 
                              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </Card>

                        {/* Controls - Same layout as web version */}
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <Button
                              onClick={revealNextLetter}
                              disabled={revealedIndices.size >= (currentWord.word.replace(/\s/g, '').length || 0)}
                              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 text-sm shadow-lg shadow-amber-500/25"
                            >
                              💡 Give me a letter!
                            </Button>
                            
                            <Button
                              onClick={loadNewWord}
                              variant="outline"
                              className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20 py-2.5 text-sm"
                            >
                              Skip
                            </Button>
                          </div>

                          {/* Guess Input */}
                          <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-3 shadow-2xl">
                            <form onSubmit={handleGuessSubmit} className="flex gap-2">
                              <input
                                type="text"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="Type your guess..."
                                className="flex-1 px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm"
                                disabled={isCorrect}
                              />
                              <Button 
                                type="submit" 
                                disabled={!guess.trim() || isCorrect}
                                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-4 py-2.5 text-sm shadow-lg shadow-emerald-500/25"
                              >
                                Guess
                              </Button>
                            </form>
                          </Card>

                          {/* Feedback Messages */}
                          <div className="min-h-[50px]">
                            <AnimatePresence>
                              {showSuccess && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                  className="bg-emerald-500/20 border border-emerald-400/50 rounded-lg p-3 text-emerald-400 text-center shadow-lg shadow-emerald-500/10"
                                >
                                  <div className="flex items-center justify-center gap-2 text-sm">
                                    <span className="text-lg">🎉</span>
                                    <span>Excellent! You got it right!</span>
                                    <span className="text-lg">😊</span>
                                  </div>
                                </motion.div>
                              )}

                              {showError && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                  className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-400 text-center shadow-lg shadow-red-500/10"
                                >
                                  <div className="flex items-center justify-center gap-2 text-sm">
                                    <span className="text-lg">💭</span>
                                    <span>Not quite right. Try again!</span>
                                    <span className="text-lg">😔</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Simulator Label */}
          <div className="text-center mt-4">
            <p className="text-white/60 text-sm">📱 Mobile App Simulator</p>
            <p className="text-white/40 text-xs mt-1">Experience how the React Native app will look and feel</p>
          </div>
        </div>
      </div>
    </div>
  );
}