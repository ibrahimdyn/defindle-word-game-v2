import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Info, Clock, CheckCircle, RotateCcw, Smartphone } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import type { Word } from '../../../shared/schema';
import { playLetterRevealSound, playSuccessSound, playErrorSound, resumeAudioContext } from "@/lib/audio";

export default function MobileDemo() {
  const [currentPhase, setCurrentPhase] = useState<'definition' | 'reveal'>('definition');

  const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [playerGuess, setPlayerGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [guessResult, setGuessResult] = useState<'correct' | 'incorrect' | null>(null);

  // Fetch a random word from the API
  const { data: currentWord, refetch: fetchNewWord } = useQuery<Word>({
    queryKey: ['/api/words/random'],
    enabled: false, // We'll manually trigger this
  });

  const startDemo = async () => {
    // Resume audio context on user interaction
    resumeAudioContext();
    
    setIsRunning(true);
    setCurrentPhase('definition');
    setRevealedLetters(new Set());
    setPlayerGuess('');
    setIsCorrect(false);
    setGuessResult(null);
    
    // Fetch a new word
    await fetchNewWord();

    setTimeout(() => {
      setCurrentPhase('reveal');
    }, 3000);
  };

  const revealNextLetter = () => {
    if (!currentWord) return;
    
    const letters = currentWord.word.split('').filter((l: string) => l !== ' ');
    const unrevealed = [];
    
    for (let i = 0; i < letters.length; i++) {
      if (!revealedLetters.has(i)) {
        unrevealed.push(i);
      }
    }
    
    if (unrevealed.length > 0) {
      const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setRevealedLetters(prev => new Set(Array.from(prev).concat(randomIndex)));
      
      // Play sound effect when letter is revealed
      playLetterRevealSound();
    }
  };

  const checkGuess = () => {
    if (!currentWord) return;
    
    const guess = playerGuess.trim().toLowerCase();
    const answer = currentWord.word.toLowerCase();
    
    if (guess === answer) {
      setIsCorrect(true);
      setGuessResult('correct');
      // Play success sound
      playSuccessSound();
      
      // Reveal all letters when correct
      const allIndices = new Set<number>();
      for (let i = 0; i < currentWord.word.replace(/\s/g, '').length; i++) {
        allIndices.add(i);
      }
      setRevealedLetters(allIndices);
      
      // Automatically move to next word after 2 seconds
      setTimeout(() => {
        startDemo();
      }, 2000);
    } else {
      setGuessResult('incorrect');
      // Play error sound
      playErrorSound();
      
      // Clear the incorrect guess result after 2 seconds
      setTimeout(() => setGuessResult(null), 2000);
    }
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkGuess();
  };

  const skipWord = () => {
    startDemo();
  };

  const resetDemo = () => {
    setIsRunning(false);
    setCurrentPhase('definition');
    setRevealedLetters(new Set());
  };

  const renderMobileWordDisplay = () => {
    if (!currentWord) return null;
    
    const letters = currentWord.word.split('');
    return (
      <div className="flex justify-center items-center gap-1 flex-wrap min-h-[60px]">
        {letters.map((letter: string, index: number) => {
          const letterIndex = letters.slice(0, index).filter((l: string) => l !== ' ').length;
          const isRevealed = revealedLetters.has(letterIndex);
          
          if (letter === ' ') {
            return <div key={index} className="w-2" />;
          }
          
          return (
            <motion.div
              key={index}
              className={`w-7 h-10 border-2 rounded-md flex items-center justify-center text-sm font-bold transition-all duration-500 ${
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-sm mx-auto">
        {/* Mobile Device Frame */}
        <div className="relative">
          <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
            <div className="bg-black rounded-[2rem] p-1">
              <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-[1.5rem] aspect-[9/19] overflow-hidden relative">
                
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-6 text-white text-xs z-20">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-2 border border-white rounded-sm">
                      <div className="w-3 h-1 bg-white rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* App Content */}
                <div className="pt-10 pb-6 px-4 h-full flex flex-col">
                  
                  {/* Header */}
                  <div className="flex items-center justify-center mb-4">
                    <Smartphone className="w-4 h-4 text-indigo-400 mr-2" />
                    <h1 className="text-lg font-bold text-white">Word Game</h1>
                  </div>

                  {/* Definition - Always Visible */}
                  {isRunning && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mb-4"
                    >
                      <div className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full text-xs font-medium mb-2">
                        <Info className="w-3 h-3" />
                        Definition
                      </div>
                      
                      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg p-3 border border-white/10">
                        <p className="text-xs leading-relaxed text-gray-100 font-medium">
                          {currentWord?.definition || "Loading word..."}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Game Phases */}
                  <div className="flex-1 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {currentPhase === 'definition' && isRunning && (
                        <motion.div
                          key="definition"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="text-center"
                        >
                          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Info className="w-5 h-5 text-indigo-400" />
                          </div>
                          <p className="text-gray-300 text-xs">Reading definition...</p>
                        </motion.div>
                      )}



                      {currentPhase === 'reveal' && (
                        <motion.div
                          key="reveal"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="text-center w-full"
                        >
                          <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium mb-3">
                            <CheckCircle className="w-3 h-3" />
                            Guess the Word
                          </div>
                          
                          {renderMobileWordDisplay()}
                          
                          <div className="w-full bg-white/10 rounded-full h-1 mt-3 mb-4">
                            <motion.div 
                              className="bg-gradient-to-r from-emerald-500 to-amber-500 h-1 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${currentWord ? (revealedLetters.size / currentWord.word.replace(/\s/g, '').length) * 100 : 0}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>

                          {/* Guess input form */}
                          {!isCorrect && (
                            <form onSubmit={handleGuessSubmit} className="w-full mb-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={playerGuess}
                                  onChange={(e) => setPlayerGuess(e.target.value.toUpperCase())}
                                  placeholder="Type your guess..."
                                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  maxLength={currentWord?.word.length}
                                />
                                <button 
                                  type="submit"
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
                                >
                                  Guess
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Give me letter and Skip buttons */}
                          {!isCorrect && (
                            <div className="w-full flex gap-2 mb-2">
                              {currentWord && revealedLetters.size < currentWord.word.replace(/\s/g, '').length && (
                                <button 
                                  onClick={revealNextLetter}
                                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
                                >
                                  Give me a letter!
                                </button>
                              )}
                              <button 
                                onClick={skipWord}
                                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
                              >
                                Skip
                              </button>
                            </div>
                          )}

                          {/* Feedback messages */}
                          {guessResult === 'correct' && (
                            <motion.div 
                              className="w-full text-center"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              <div className="inline-flex flex-col items-center gap-1 bg-emerald-500/20 text-emerald-400 px-4 py-3 rounded-full font-medium mb-3">
                                <div className="text-2xl">😊🎉</div>
                                <div className="text-xs">Correct! Well done!</div>
                              </div>
                            </motion.div>
                          )}
                          
                          {guessResult === 'incorrect' && (
                            <motion.div 
                              className="w-full text-center"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              <div className="inline-flex flex-col items-center gap-1 bg-red-500/20 text-red-400 px-4 py-3 rounded-full font-medium mb-3">
                                <div className="text-2xl">😔💭</div>
                                <div className="text-xs">Try again! Not quite right.</div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                      {!isRunning && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center"
                        >
                          <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Smartphone className="w-6 h-6 text-indigo-400" />
                          </div>
                          <h2 className="text-lg font-bold text-white mb-1">Mobile Word Game</h2>
                          <p className="text-gray-400 text-xs mb-4">Touch-optimized experience</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mobile Controls */}
                  <div className="pt-3">
                    {!isRunning && (
                      <button 
                        onClick={startDemo}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 text-sm"
                      >
                        Start Game
                      </button>
                    )}
                    

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Information */}
        <div className="mt-6 text-center">
          <h3 className="text-white text-lg font-semibold mb-3">📱 Mobile App Preview</h3>
          <div className="bg-white/10 backdrop-blur-xl border-white/20 rounded-xl p-4 mb-4">
            <p className="text-gray-200 text-sm mb-3">
              This shows how your word game works as a native mobile app with:
            </p>
            <div className="text-left space-y-1 text-xs text-gray-300">
              <div>✓ Touch-optimized interface</div>
              <div>✓ Portrait mobile layout</div>
              <div>✓ Native-style animations</div>
              <div>✓ Mobile status bar</div>
              <div>✓ Finger-friendly buttons</div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={startDemo}
              className="bg-indigo-600 hover:bg-indigo-700 text-sm"
            >
              Demo Mobile Game
            </Button>
            <Button 
              onClick={resetDemo}
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 text-sm"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}