// =====================================================
// LOADING PROGRESS BAR - Shows when loading products/company switch
// =====================================================

'use client';

import React, { useEffect, useRef, useState, useReducer } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProgressBarProps {
  isLoading: boolean;
  message?: string;
}

// Progress reducer to handle state updates
type ProgressAction = 
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

function progressReducer(state: { progress: number; visible: boolean }, action: ProgressAction) {
  switch (action.type) {
    case 'START':
      return { progress: 0, visible: true };
    case 'TICK':
      const newProgress = Math.min(90, state.progress + (
        state.progress < 30 ? 5 :
        state.progress < 50 ? 3 :
        state.progress < 70 ? 2 : 1
      ));
      return { ...state, progress: newProgress };
    case 'COMPLETE':
      return { ...state, progress: 100 };
    case 'RESET':
      return { progress: 0, visible: false };
    default:
      return state;
  }
}

export function LoadingProgressBar({ isLoading, message = "Loading products..." }: LoadingProgressBarProps) {
  const [state, dispatch] = useReducer(progressReducer, { progress: 0, visible: false });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // Handle loading state changes
  useEffect(() => {
    clearTimers();
    
    if (isLoading) {
      // Start progress
      dispatch({ type: 'START' });
      
      // Start progress simulation
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 500);
    } else if (state.visible) {
      // Complete progress
      dispatch({ type: 'COMPLETE' });
      
      // Hide after animation
      hideTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'RESET' });
      }, 300);
    }
    
    return clearTimers;
  }, [isLoading, state.visible]);

  if (!state.visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      {/* Progress bar container */}
      <div className="h-1 bg-muted/30 w-full">
        <div 
          className={cn(
            "h-full bg-primary transition-all duration-300 ease-out",
            isLoading && "animate-pulse"
          )}
          style={{ width: `${state.progress}%` }}
        />
      </div>
      
      {/* Loading message overlay - only show for long loads */}
      {isLoading && state.progress > 20 && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-b-lg shadow-sm border border-t-0 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-muted-foreground">{message}</span>
        </div>
      )}
    </div>
  );
}

// Inline loading indicator for content areas
export function LoadingIndicator({ isLoading, message = "Loading..." }: LoadingProgressBarProps) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center py-8 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}
