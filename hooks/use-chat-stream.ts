import { useRef, useState } from 'react';
const STREAM_TIMEOUT_MS = 15000; // 15 seconds

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
  const timeoutRef = useRef<number | null>(null);

  async function send(msg: string) {
    setBusy(true);
    setStartedStreaming(false);
    appendNewline();
    appendText(`> ${msg}`);
    appendNewline();

    const controller = new AbortController();
    controllerRef.current = controller;

    // Setup timeout
    timeoutRef.current = window.setTimeout(() => {
      if (controllerRef.current) {
        controllerRef.current.abort('timeout');
      }
    }, STREAM_TIMEOUT_MS);

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        
    try {
      const res = await fetch('/api/chat?protocol=data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: msg, thread_id: threadIdRef.current }],
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }
      
      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let streamStarted = false;
      
      for (;;) {
        const { done, value } = await reader.read();
        
        if (!streamStarted && value) {
          streamStarted = true;
          setStartedStreaming(true);
          appendPrefix();
          appendText(' ');
        }

        if (done) {
          // Handle any remaining partial chunk
          console.log('STREAM_DON at ', Date.now());
          const remaining = decoder.decode(undefined, { stream: false });
          if (remaining) appendText(remaining);
          console.log('CALLING setBusy(false) at ', Date.now());
          setBusy(false);
          console.log('setBusy FALSE at ', Date.now());
          break;
        }

        buf += decoder.decode(value, { stream: true });
        for (;;) {
          const i = buf.indexOf('\n');
          if (i < 0) break;
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          if (line.startsWith('data:')) {
            try {
              const chunk = String(line.slice(6));
              if (chunk) appendText(chunk);
            } catch {
              // ignore bad chunk
              // console.log('Bad chunk:', "--", line, "--");
            }
          }
        }
      }
      appendNewline();
    } catch (err: any) {
      console.log('🔍 STREAM ERROR at', Date.now(), 'error:', err);
      setBusy(false);
      const isTimeout = err?.name === 'AbortError' && err.message === 'timeout';
      
      if (isTimeout) {
        console.log('🔍 FRONTEND TIMEOUT TRIGGERED - stream was hanging');
      }
      
      if (err?.name === 'AbortError') {
        appendText(isTimeout ? '[request timed out, please try again later.]' : '^C');
        appendNewline();
      } else {
        appendNewline();
        appendText(err?.message || '[error connecting to raghu\'s ai]');
        appendNewline();
      }

    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // Ignore reader cleanup errors
        }
      }
      
      controllerRef.current = null;
    }
  }

  return { busy, send } as const;
}


