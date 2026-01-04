import { useState, useCallback, useRef } from 'react';

/**
 * useUndoRedo - Hook for managing undo/redo history
 *
 * Tracks changes to specified state values and allows undo/redo
 * Optimized to avoid storing duplicate states
 *
 * @param {Object} initialState - Initial state object
 * @param {number} maxHistory - Maximum history size (default: 50)
 * @returns {Object} - { state, setState, undo, redo, canUndo, canRedo, clearHistory }
 */
export function useUndoRedo(initialState, maxHistory = 50) {
  // Current state
  const [state, setStateInternal] = useState(initialState);

  // History stacks
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track if we're in the middle of undo/redo to prevent pushing to history
  const isUndoRedoRef = useRef(false);

  // Set state and add to history
  const setState = useCallback((newStateOrUpdater) => {
    // Skip if we're currently doing undo/redo
    if (isUndoRedoRef.current) {
      return;
    }

    setStateInternal(prev => {
      const newState = typeof newStateOrUpdater === 'function'
        ? newStateOrUpdater(prev)
        : newStateOrUpdater;

      // Only add to history if state actually changed
      const stateChanged = JSON.stringify(newState) !== JSON.stringify(prev);

      if (stateChanged) {
        setHistory(currentHistory => {
          // Remove any future history if we're not at the end
          const truncatedHistory = currentHistory.slice(0, currentIndex + 1);

          // Add new state
          const newHistory = [...truncatedHistory, newState];

          // Limit history size
          const limitedHistory = newHistory.length > maxHistory
            ? newHistory.slice(newHistory.length - maxHistory)
            : newHistory;

          return limitedHistory;
        });

        setCurrentIndex(currentIdx => {
          const newHistory = history.slice(0, currentIdx + 1);
          newHistory.push(newState);
          const finalLength = Math.min(newHistory.length, maxHistory);
          return finalLength - 1;
        });
      }

      return newState;
    });
  }, [currentIndex, maxHistory, history]);

  // Undo
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
      isUndoRedoRef.current = false;
    }
  }, [currentIndex, history]);

  // Redo
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setStateInternal(history[newIndex]);
      isUndoRedoRef.current = false;
    }
  }, [currentIndex, history]);

  // Can undo/redo
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([state]);
    setCurrentIndex(0);
  }, [state]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    historyLength: history.length,
    currentIndex
  };
}
