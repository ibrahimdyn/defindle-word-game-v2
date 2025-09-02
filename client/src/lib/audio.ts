// Audio utility functions for game sound effects
let audioContext: AudioContext | null = null;

// Initialize audio context
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Create a pleasant letter reveal sound
export const playLetterRevealSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Create oscillator for main tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Set frequency for a pleasant chime sound (C5 note)
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
    
    // Create envelope for smooth attack and decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); // Gentle decay
    
    // Use sine wave for smooth, pleasant sound
    oscillator.type = 'sine';
    
    // Start and stop the sound
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Create a success sound for correct guesses
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Create a chord-like success sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.type = 'sine';
      
      // Stagger the notes slightly for a nice effect
      const startTime = ctx.currentTime + (index * 0.1);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.05, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
    
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Create a gentle error sound
export const playErrorSound = () => {
  try {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Lower frequency for error sound
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
    
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

// Resume audio context on user interaction (required by browsers)
export const resumeAudioContext = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (error) {
    console.log('Audio context resume failed');
  }
};