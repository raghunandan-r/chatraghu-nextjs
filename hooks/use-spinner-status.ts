import { useEffect, useRef, useState } from 'react';

export function useSpinnerStatus(busy: boolean, spinnerFrames: string[], loadingTexts: string[]) {
  const [spinnerChar, setSpinnerChar] = useState<string>('');
  const [statusText, setStatusText] = useState('');
  const [startedStreaming, setStartedStreaming] = useState(false);
  const startedStreamingRef = useRef(false);
  const spinnerIndexRef = useRef(0);
  
  const spinnerStartTimeoutRef = useRef<number | null>(null);
  const spinnerIntervalRef = useRef<number | null>(null);
  const textStartTimeoutRef = useRef<number | null>(null);
  const textIntervalRef = useRef<number | null>(null);

  // Single source of truth for cleanup
  const clearTimers = () => {
    if (spinnerStartTimeoutRef.current) {
      clearTimeout(spinnerStartTimeoutRef.current);
      spinnerStartTimeoutRef.current = null;
    }
    if (spinnerIntervalRef.current) {
      clearInterval(spinnerIntervalRef.current);
      spinnerIntervalRef.current = null;
    }
    if (textStartTimeoutRef.current) {
      clearTimeout(textStartTimeoutRef.current);
      textStartTimeoutRef.current = null;
    }
    if (textIntervalRef.current) {
      clearInterval(textIntervalRef.current);
      textIntervalRef.current = null;
    }
  };

  // Update streaming ref
  useEffect(() => {
    startedStreamingRef.current = startedStreaming;
  }, [startedStreaming]);

  // Main spinner effect
  useEffect(() => {
    // Clear everything when not busy
    console.log(' busy state changed to ', busy, ' at ', Date.now());
    if (!busy) {
      console.log(' clearing timers at ', Date.now());
      clearTimers();
      setSpinnerChar('');
      setStatusText('');
      spinnerIndexRef.current = 0;
      return;
    }

    // Start spinner immediately without delay
    setSpinnerChar(spinnerFrames[0]);
    spinnerIntervalRef.current = window.setInterval(() => {
      spinnerIndexRef.current = (spinnerIndexRef.current + 1) % spinnerFrames.length;
      setSpinnerChar(spinnerFrames[spinnerIndexRef.current]);
    }, 80);

    // Handle loading text
    if (!startedStreamingRef.current) {
      setStatusText(loadingTexts[0]);
      let textIdx = 0;
      textIntervalRef.current = window.setInterval(() => {
        if (startedStreamingRef.current) {
          setStatusText('');
          clearInterval(textIntervalRef.current!);
          textIntervalRef.current = null;
          return;
        }
        textIdx = (textIdx + 1) % loadingTexts.length;
        setStatusText(loadingTexts[textIdx]);
      }, 1000);
    }

    // Cleanup function
    return clearTimers;
  }, [busy, spinnerFrames, loadingTexts]);

  // Handle streaming state changes
  useEffect(() => {
    if (startedStreaming) {
      setStatusText('');
      // Don't clear timers - let spinner continue until busy becomes false
    }
  }, [startedStreaming]);

  return { spinnerChar, statusText, startedStreaming, setStartedStreaming } as const;
}


