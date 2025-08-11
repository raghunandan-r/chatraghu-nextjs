import type React from 'react';
import type { SerializableLine } from './types';
import Prefix from './Prefix';

type Props = {
  lines: SerializableLine[];
  messagesContainerRef: React.RefObject<HTMLPreElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

export default function Stream({ lines, messagesContainerRef, messagesEndRef }: Props) {
  return (
    <pre ref={messagesContainerRef} className="stream" aria-live="polite">
      {lines.map((segments, lineIndex) => (
        <span key={lineIndex}>
          {segments.map((segment, segmentIndex) => (
            typeof segment === 'string' ? (
              <span key={segmentIndex}>{segment}</span>
            ) : (
              <Prefix key={segmentIndex} />
            )
          ))}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      ))}
      <div ref={messagesEndRef} />
    </pre>
  );
}


