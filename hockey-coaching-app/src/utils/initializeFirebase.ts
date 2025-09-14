// Firebase initialization utilities

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

    // Default presets are now handled in-code, no database creation needed
    console.log('✅ Firebase defaults initialized (presets handled in-app)');
  } catch (error) {
    console.error('Failed to initialize Firebase defaults:', error);
    // Don't throw the error - this should not break the app
  }
};