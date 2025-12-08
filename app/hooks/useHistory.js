'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_SIZE = 50;
const COMMIT_DEBOUNCE_MS = 500; // Wait 500ms after last change before committing

/**
 * Custom hook for undo/redo functionality
 * Tracks state changes and allows reverting to previous states
 */
export function useHistory(initialState) {
  // Use a single state object to keep history and index in sync
  const [state, setState] = useState({
    history: [initialState],
    index: 0
  });
  const commitTimeoutRef = useRef(null);
  const pendingStateRef = useRef(null);
  
  const { history, index: historyIndex } = state;
  
  // Get current state from history
  const currentState = history[historyIndex];
  
  // Check if undo/redo is available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Commit pending state to history (debounced)
  const commitToHistory = useCallback((newState) => {
    // Clear any pending commit
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    
    pendingStateRef.current = newState;
    
    commitTimeoutRef.current = setTimeout(() => {
      const stateToCommit = pendingStateRef.current;
      if (!stateToCommit) return;
      
      setState(prev => {
        // Remove any redo history when making new changes
        const newHistory = prev.history.slice(0, prev.index + 1);
        
        // Check if the new state is actually different from the last committed state
        const lastState = newHistory[newHistory.length - 1];
        if (JSON.stringify(lastState) === JSON.stringify(stateToCommit)) {
          return prev;
        }
        
        // Add new state
        newHistory.push(stateToCommit);
        
        // Trim history if too long
        let newIndex = newHistory.length - 1;
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
          newIndex = newHistory.length - 1;
        }
        
        return { history: newHistory, index: newIndex };
      });
      
      pendingStateRef.current = null;
    }, COMMIT_DEBOUNCE_MS);
  }, []);
  
  // Update state without committing to history (for live preview during slider drag)
  const updateState = useCallback((newState) => {
    pendingStateRef.current = newState;
  }, []);
  
  // Undo - go back one step
  const undo = useCallback(() => {
    // Cancel any pending commit
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      pendingStateRef.current = null;
    }
    
    if (historyIndex <= 0) return null;
    
    const newIndex = historyIndex - 1;
    const result = history[newIndex];
    setState(prev => ({ ...prev, index: newIndex }));
    return result;
  }, [historyIndex, history]);
  
  // Redo - go forward one step
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return null;
    
    const newIndex = historyIndex + 1;
    const result = history[newIndex];
    setState(prev => ({ ...prev, index: newIndex }));
    return result;
  }, [historyIndex, history]);
  
  // Reset history with new initial state
  const resetHistory = useCallback((newInitialState) => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    pendingStateRef.current = null;
    setState({ history: [newInitialState], index: 0 });
  }, []);
  
  return {
    currentState,
    canUndo,
    canRedo,
    undo,
    redo,
    commitToHistory,
    updateState,
    resetHistory,
    historyLength: history.length,
    historyIndex
  };
}

export default useHistory;

