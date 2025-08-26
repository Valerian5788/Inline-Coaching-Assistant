import React from 'react';
import type { DrawingElement } from '../../types';

export interface HistoryState {
  elements: DrawingElement[];
  timestamp: number;
}

export class DrawingHistory {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistorySize: number = 50;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  // Save current state to undo stack
  saveState(elements: DrawingElement[]): void {
    const state: HistoryState = {
      elements: JSON.parse(JSON.stringify(elements)), // Deep clone
      timestamp: Date.now()
    };

    // Add to undo stack
    this.undoStack.push(state);

    // Limit undo stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  // Undo the last action
  undo(currentElements: DrawingElement[]): DrawingElement[] | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Save current state to redo stack before undoing
    const currentState: HistoryState = {
      elements: JSON.parse(JSON.stringify(currentElements)),
      timestamp: Date.now()
    };
    this.redoStack.push(currentState);

    // Get previous state
    const previousState = this.undoStack.pop()!;
    return previousState.elements;
  }

  // Redo the last undone action
  redo(currentElements: DrawingElement[]): DrawingElement[] | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack before redoing
    const currentState: HistoryState = {
      elements: JSON.parse(JSON.stringify(currentElements)),
      timestamp: Date.now()
    };
    this.undoStack.push(currentState);

    // Get next state
    const nextState = this.redoStack.pop()!;
    return nextState.elements;
  }

  // Check if undo is available
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  // Check if redo is available
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Clear all history
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  // Get undo stack size
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  // Get redo stack size
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  // Get a summary of the history state for debugging
  getHistorySummary(): {
    undoCount: number;
    redoCount: number;
    canUndo: boolean;
    canRedo: boolean;
  } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }
}

// Hook for using drawing history in React components
export const useDrawingHistory = (maxHistorySize: number = 50) => {
  const [history] = React.useState(() => new DrawingHistory(maxHistorySize));
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  const updateHistoryState = React.useCallback(() => {
    setCanUndo(history.canUndo());
    setCanRedo(history.canRedo());
  }, [history]);

  const saveState = React.useCallback((elements: DrawingElement[]) => {
    history.saveState(elements);
    updateHistoryState();
  }, [history, updateHistoryState]);

  const undo = React.useCallback((currentElements: DrawingElement[]): DrawingElement[] | null => {
    const result = history.undo(currentElements);
    updateHistoryState();
    return result;
  }, [history, updateHistoryState]);

  const redo = React.useCallback((currentElements: DrawingElement[]): DrawingElement[] | null => {
    const result = history.redo(currentElements);
    updateHistoryState();
    return result;
  }, [history, updateHistoryState]);

  const clear = React.useCallback(() => {
    history.clear();
    updateHistoryState();
  }, [history, updateHistoryState]);

  return {
    saveState,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    getHistorySummary: history.getHistorySummary.bind(history)
  };
};

