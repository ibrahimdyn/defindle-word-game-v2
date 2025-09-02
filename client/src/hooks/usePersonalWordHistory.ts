/**
 * Personal word history hook for tracking user's word learning progress
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeviceIdManager } from "@/lib/deviceId";
import { apiRequest } from "@/lib/queryClient";
import type { UserWordHistory, InsertUserWordHistory, UserPreferences, InsertUserPreferences } from "@shared/schema";

export function usePersonalWordHistory(userId?: string) {
  const queryClient = useQueryClient();
  const deviceId = DeviceIdManager.getDeviceId();

  // Record when a word is seen
  const recordWordSeen = useMutation({
    mutationFn: async (wordData: {
      word: string;
      guessedCorrectly?: number;
      hintCount?: number;
      gameMode?: string;
    }) => {
      const historyRecord: InsertUserWordHistory = {
        userId: userId || null,
        deviceId,
        word: wordData.word.toUpperCase(),
        seenAt: new Date().toISOString(),
        guessedCorrectly: wordData.guessedCorrectly || 0,
        hintCount: wordData.hintCount || 0,
        gameMode: wordData.gameMode || 'normal',
      };
      
      const response = await fetch('/api/word-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyRecord),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['word-history', deviceId] });
      queryClient.invalidateQueries({ queryKey: ['seen-words', deviceId] });
    },
  });

  // Get seen words list
  const { data: seenWords, isLoading: isLoadingSeenWords } = useQuery({
    queryKey: ['seen-words', deviceId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/word-history/seen/${deviceId}${userId ? `?userId=${userId}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ seenWords: string[] }>;
    },
  });

  // Get full word history
  const { data: wordHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['word-history', deviceId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/word-history/${deviceId}${userId ? `?userId=${userId}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ history: UserWordHistory[] }>;
    },
  });

  // Clear word history
  const clearHistory = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/word-history/${deviceId}${userId ? `?userId=${userId}` : ''}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word-history', deviceId] });
      queryClient.invalidateQueries({ queryKey: ['seen-words', deviceId] });
    },
  });

  // Get smart word (avoiding repetition)
  const getSmartWord = useMutation({
    mutationFn: async (difficulty: string = 'mixed') => {
      const response = await fetch(`/api/words/smart/${deviceId}?difficulty=${difficulty}${userId ? `&userId=${userId}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  return {
    // Word history
    recordWordSeen,
    seenWords: seenWords?.seenWords || [],
    wordHistory: wordHistory?.history || [],
    isLoadingSeenWords,
    isLoadingHistory,
    clearHistory,
    
    // Smart word selection
    getSmartWord,
    
    // Device info
    deviceId,
    isReturningUser: DeviceIdManager.isReturningUser(),
  };
}

export function useUserPreferences(userId?: string) {
  const queryClient = useQueryClient();
  const deviceId = DeviceIdManager.getDeviceId();

  // Get user preferences
  const { data: preferences, isLoading: isLoadingPrefs } = useQuery({
    queryKey: ['preferences', deviceId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/preferences/${deviceId}${userId ? `?userId=${userId}` : ''}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<UserPreferences>;
    },
  });

  // Save preferences
  const savePreferences = useMutation({
    mutationFn: async (prefs: Partial<InsertUserPreferences>) => {
      const preferencesData: InsertUserPreferences = {
        userId: userId || null,
        deviceId,
        preferredDifficulty: prefs.preferredDifficulty || 'mixed',
        soundEnabled: prefs.soundEnabled ?? 1,
        hintsEnabled: prefs.hintsEnabled ?? 1,
        dailyWordGoal: prefs.dailyWordGoal || 10,
        vocabulary_level: prefs.vocabulary_level || 'intermediate',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferencesData),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', deviceId] });
    },
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<InsertUserPreferences>) => {
      const response = await fetch(`/api/preferences/${deviceId}${userId ? `?userId=${userId}` : ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', deviceId] });
    },
  });

  return {
    preferences,
    isLoadingPrefs,
    savePreferences,
    updatePreferences,
  };
}