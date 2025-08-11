import { useEffect, useRef, useState } from 'react';
import { LOCALSTORAGE_KEYS } from '@/components/terminal/constants';
import type { SerializableLine, SerializableSegment } from '@/components/terminal/types';

export function useTerminalHistory() {
  const [lines, setLines] = useState<SerializableLine[]>([[]]);
  const totalCharsRef = useRef<number>(0);

  useEffect(() => {
    try {
      const storedLines = localStorage.getItem(LOCALSTORAGE_KEYS.history);
      if (storedLines) {
        const parsed: SerializableLine[] = JSON.parse(storedLines);
        setLines(parsed);
        let charCount = 0;
        for (const line of parsed) {
          for (const segment of line) {
            if (typeof segment === 'string') charCount += segment.length;
          }
        }
        totalCharsRef.current = charCount;
      }
    } catch {
      localStorage.removeItem(LOCALSTORAGE_KEYS.history);
    }
  }, []);

  useEffect(() => {
    if (lines.length > 0 && (lines.length > 1 || lines[0].length > 0)) {
      try {
        localStorage.setItem(LOCALSTORAGE_KEYS.history, JSON.stringify(lines));
      } catch {
        // ignore storage errors
      }
    }
  }, [lines]);

  return { lines, setLines, totalCharsRef } as const;
}


