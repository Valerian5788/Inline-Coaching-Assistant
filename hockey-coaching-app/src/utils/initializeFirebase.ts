import { dbHelpers } from '../db';
import type { GamePreset } from '../types';

/**
 * Initialize Firebase with default data when the app first runs
 */
export const initializeFirebaseDefaults = async (): Promise<void> => {
  try {
    // Check if default game presets already exist
    const existingPresets = await dbHelpers.getAllGamePresets();
    
    if (existingPresets.length === 0) {
      // Create default game presets
      const now = new Date().toISOString();
      
      // Get current user ID
      const userId = (await import('../firebase')).auth.currentUser?.uid;
      if (!userId) return;

      const seniorPreset: GamePreset = {
        id: 'preset-senior',
        name: 'Senior Game',
        periods: 2,
        periodMinutes: 25,
        hasOvertime: true,
        overtimeMinutes: 5,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        userId
      };
      
      const juniorPreset: GamePreset = {
        id: 'preset-junior',
        name: 'Junior Game',
        periods: 2,
        periodMinutes: 20,
        hasOvertime: false,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        userId
      };
      
      await Promise.all([
        dbHelpers.createGamePreset(seniorPreset),
        dbHelpers.createGamePreset(juniorPreset)
      ]);
      
      console.log('✅ Default game presets created');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase defaults:', error);
  }
};