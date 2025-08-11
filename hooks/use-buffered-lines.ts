import { useRef } from 'react';
import { BUFFER_CAP } from '@/components/terminal/constants';
import type { PendingNode, SerializableLine, SerializableSegment } from '@/components/terminal/types';

export function useBufferedLines(
  lines: SerializableLine[],
  setLines: React.Dispatch<React.SetStateAction<SerializableLine[]>>,
  totalCharsRef: React.MutableRefObject<number>
) {
  const pendingNodesRef = useRef<PendingNode[]>([]);
  const raf = useRef<number | null>(null);

  const flush = () => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(doFlush);
  };

  const doFlush = () => {
    const pending = pendingNodesRef.current;
    pendingNodesRef.current = [];

    setLines(currentLines => {
      const newLines: SerializableLine[] = JSON.parse(JSON.stringify(currentLines));
      let currentLineIndex = newLines.length - 1;

      for (const node of pending) {
        if (node.type === 'prefix') {
          if (newLines[currentLineIndex].length > 0) {
            newLines.push([]);
            currentLineIndex++;
          }
          newLines[currentLineIndex].push({ type: 'prefix' });
        } else if (node.type === 'text') {
          const parts = node.value.split('\n');
          if (parts[0]) {
            newLines[currentLineIndex].push(parts[0]);
            totalCharsRef.current += parts[0].length;
          }
          for (let i = 1; i < parts.length; i++) {
            newLines.push([]);
            currentLineIndex++;
            if (parts[i]) {
              newLines[currentLineIndex].push(parts[i]);
              totalCharsRef.current += parts[i].length;
            }
          }
        } else if (node.type === 'newline') {
          newLines.push([]);
          currentLineIndex++;
        }
      }

      while (totalCharsRef.current > BUFFER_CAP && newLines.length > 1) {
        const removedLine = newLines.shift()!;
        const removedChars = removedLine.reduce((count: number, segment: SerializableSegment) => {
          return count + (typeof segment === 'string' ? segment.length : 0);
        }, 0);
        totalCharsRef.current -= removedChars;
      }

      return newLines;
    });

    raf.current = null;
  };

  const appendText = (text: string) => {
    pendingNodesRef.current.push({ type: 'text', value: text });
    flush();
  };
  const appendPrefix = () => {
    pendingNodesRef.current.push({ type: 'prefix' });
    flush();
  };
  const appendNewline = () => {
    pendingNodesRef.current.push({ type: 'newline' });
    flush();
  };
  const clear = () => {
    setLines([[]]);
    totalCharsRef.current = 0;
  };

  return { appendText, appendPrefix, appendNewline, clear } as const;
}


