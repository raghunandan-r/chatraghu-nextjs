import { useRef, useState } from 'react';

type SendDeps = {
  appendText: (t: string) => void;
  appendPrefix: () => void;
  appendNewline: () => void;
  setStartedStreaming: (v: boolean) => void;
  threadIdRef: React.MutableRefObject<string | null>;
};

export function useChatStream({ appendText, appendPrefix, appendNewline, setStartedStreaming, threadIdRef }: SendDeps) {
  const [busy, setBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  async function send(msg: string) {
    setBusy(true);
    setStartedStreaming(false);
    appendNewline();
    appendText(`> ${msg}`);
    appendNewline();

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch('/api/chat?protocol=data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: msg, thread_id: threadIdRef.current }],
        }),
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      appendPrefix();
      appendText(' ');
      let streamStarted = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!streamStarted) {
          streamStarted = true;
          setStartedStreaming(true);
        }
        buf += decoder.decode(value, { stream: true });
        for (;;) {
          const i = buf.indexOf('\n');
          if (i < 0) break;
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          if (line.startsWith('0:')) {
            try {
              const chunk = JSON.parse(line.slice(2));
              if (chunk) appendText(String(chunk));
            } catch {
              // ignore bad chunk
            }
          }
        }
      }
      appendNewline();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        appendText('^C');
        appendNewline();
      } else {
        appendNewline();
        appendText('[error connecting to /api/chat]');
        appendNewline();
      }
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  }

  return { busy, send } as const;
}


