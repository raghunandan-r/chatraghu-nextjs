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

  useEffect(() => { startedStreamingRef.current = startedStreaming; }, [startedStreaming]);

  useEffect(() => {
    const clearAll = () => {
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

    if (!busy) {
      clearAll();
      setSpinnerChar('');
      setStatusText('');
      spinnerIndexRef.current = 0;
      return;
    }

    spinnerStartTimeoutRef.current = window.setTimeout(() => {
      setSpinnerChar(spinnerFrames[spinnerIndexRef.current]);
      spinnerIntervalRef.current = window.setInterval(() => {
        spinnerIndexRef.current = (spinnerIndexRef.current + 1) % spinnerFrames.length;
        setSpinnerChar(spinnerFrames[spinnerIndexRef.current]);
      }, 80);
    }, 100);

    textStartTimeoutRef.current = window.setTimeout(() => {
      if (startedStreamingRef.current) return;
      setStatusText(loadingTexts[0]);
      let textIdx = 0;
      textIntervalRef.current = window.setInterval(() => {
        if (startedStreamingRef.current) {
          setStatusText('');
          if (textIntervalRef.current) {
            clearInterval(textIntervalRef.current);
            textIntervalRef.current = null;
          }
          return;
        }
        textIdx = (textIdx + 1) % loadingTexts.length;
        setStatusText(loadingTexts[textIdx]);
      }, 1500);
    }, 1000);

    return () => clearAll();
  }, [busy, spinnerFrames, loadingTexts]);

  useEffect(() => {
    if (startedStreaming) {
      setStatusText('');
      if (textStartTimeoutRef.current) {
        clearTimeout(textStartTimeoutRef.current);
        textStartTimeoutRef.current = null;
      }
      if (textIntervalRef.current) {
        clearInterval(textIntervalRef.current);
        textIntervalRef.current = null;
      }
    }
  }, [startedStreaming]);

  return { spinnerChar, statusText, startedStreaming, setStartedStreaming } as const;
}


