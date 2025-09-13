import { dbHelpers } from '../db';
import type { GamePreset } from '../types';

/**
 * Initialize Firebase with default data when the app first runs
 */
export const initializeFirebaseDefaults = async (): Promise<void> => {
  try {
    // Get current user ID
    const userId = (await import('../firebase')).auth.currentUser?.uid;
    if (!userId) {
      console.log('No authenticated user, skipping Firebase defaults initialization');
      return;
    }

    // Check if default game presets already exist
    const existingPresets = await dbHelpers.getAllGamePresets().catch((error) => {
      console.log('GamePresets collection not accessible yet:', error.message);
      return [];
    });

    if (existingPresets.length === 0) {
      // Create default game presets
      const now = new Date().toISOString();

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

      try {
        await Promise.all([
          dbHelpers.createGamePreset(seniorPreset),
          dbHelpers.createGamePreset(juniorPreset)
        ]);

        console.log('✅ Default game presets created');
      } catch (error) {
        console.log('GamePreset creation failed (likely permissions), skipping defaults:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase defaults:', error);
    // Don't throw the error - this should not break the app
  }
};