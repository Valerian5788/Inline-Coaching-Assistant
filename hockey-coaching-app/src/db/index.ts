// Import Firebase database helpers
import { firebaseDbHelpers, subscribeToCollection } from './firebase';

// Export Firebase helpers as the main dbHelpers
export const dbHelpers = firebaseDbHelpers;

// Export real-time subscription helper
export { subscribeToCollection };