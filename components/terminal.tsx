// components/terminal.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { GitIcon, LinkedInIcon } from '@/components/icons';

const BUFFER_CAP = 512 * 1024; // keep last 512KB
const BANNER_large = String.raw`
                          ░██                  
                          ░██                  
░██░████░██████  ░████████░████████ ░██    ░██ 
░███         ░██░██    ░██░██    ░██░██    ░██ 
░██     ░███████░██    ░██░██    ░██░██    ░██ 
░██    ░██   ░██░██   ░███░██    ░██░██   ░███ 
░██     ░█████░██░█████░██░██    ░██ ░█████░██ 
                       ░██                     
                 ░███████                      
                                               
`;

const BANNER_small = String.raw`
                  ░█             
                  ░█             
░█░███░███  ░█████░█████ ░█   ░█ 
░██      ░█░█   ░█░█   ░█░█   ░█ 
░█    ░████░█   ░█░█   ░█░█   ░█ 
░█   ░█  ░█░█  ░██░█   ░█░█  ░██ 
░█    ░███░█░███░█░█   ░█ ░███░█ 
                ░█               
             ░███               
`;




type PendingNode = 
  | { type: 'text'; value: string }
  | { type: 'prefix' }
  | { type: 'newline' };

export default function Terminal() {
  const outRef = useRef<HTMLPreElement>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [spinnerChar, setSpinnerChar] = useState<string>('');
  const [lines, setLines] = useState<Array<Array<React.ReactNode>>>([[]]);
  const history = useRef<string[]>([]);
  const histIdx = useRef<number>(-1);
  const pendingNodesRef = useRef<PendingNode[]>([]);
  const totalCharsRef = useRef<number>(0);
  const raf = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const spinnerIndexRef = useRef<number>(0);
  const spinnerFrames = useRef<string[]>(['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureStartRef = useRef<HTMLSpanElement>(null);
  const measureEndRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const selectionRef = useRef<HTMLSpanElement>(null);

  // Loading text + streaming coordination
  const [statusText, setStatusText] = useState('');
  const [startedStreaming, setStartedStreaming] = useState(false);
  const startedStreamingRef = useRef(false);

  // Timers for delayed spinner + loading text
  const spinnerStartTimeoutRef = useRef<number | null>(null);
  const spinnerIntervalRef = useRef<number | null>(null);
  const textStartTimeoutRef = useRef<number | null>(null);
  const textIntervalRef = useRef<number | null>(null);

  const loadingTexts = useRef<string[]>([
    'Thinking...',
    'Retrieving info...',
    'Processing...',
    'Styling the resp!@#$%^&*...',
  ]);

  // Helper functions for managing React nodes
  const appendText = (text: string) => {
    pendingNodesRef.current.push({ type: 'text', value: text });
    flush();
  };

  const appendRaghuPrefix = () => {
    pendingNodesRef.current.push({ type: 'prefix' });
    flush();
  };

  const appendNewline = () => {
    pendingNodesRef.current.push({ type: 'newline' });
    flush();
  };

  const flush = () => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(doFlush);
  };

  const doFlush = () => {
    const pending = pendingNodesRef.current;
    pendingNodesRef.current = [];

    setLines(currentLines => {
      let newLines = [...currentLines];
      let currentLineIndex = newLines.length - 1;

      for (const node of pending) {
        if (node.type === 'prefix') {
          // If current line is not empty, start a new line
          if (newLines[currentLineIndex].length > 0) {
            newLines.push([]);
            currentLineIndex++;
          }
          // Add the styled prefix
          const prefixElement = (
            <span key={`prefix-${Date.now()}-${Math.random()}`} className="raghu-prefix">
              raghu &gt;
            </span>
          );

          newLines[currentLineIndex].push(prefixElement);
        } else if (node.type === 'text') {
          // Split text on newlines
          const parts = node.value.split('\n');
          
          // First part goes to current line
          if (parts[0]) {
            newLines[currentLineIndex].push(parts[0]);
            totalCharsRef.current += parts[0].length;
          }
          
          // Each subsequent part starts a new line
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

      // Enforce buffer cap
      while (totalCharsRef.current > BUFFER_CAP && newLines.length > 1) {
        const removedLine = newLines.shift()!;
        // Calculate characters removed
        const removedChars = removedLine.reduce((count: number, segment) => {
          return count + (typeof segment === 'string' ? segment.length : 0);
        }, 0);
        totalCharsRef.current -= removedChars;
      }

      return newLines;
    });

    // Handle scroll-to-bottom
    if (outRef.current) {
      const el = outRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      if (nearBottom) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }

    raf.current = null;
  };

  const updateCaretAndSelection = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const selStart = inputEl.selectionStart ?? inputEl.value.length;
    const selEnd = inputEl.selectionEnd ?? selStart;
    const baseLeftPx = 25; // prompt (11) + padding-left (22) - box-padding (4)
    const scrollLeft = inputEl.scrollLeft || 0;

    if (measureStartRef.current) {
      measureStartRef.current.textContent = inputEl.value.slice(0, selStart);
    }
    if (measureEndRef.current) {
      measureEndRef.current.textContent = inputEl.value.slice(0, selEnd);
    }

    const startWidth = measureStartRef.current?.offsetWidth ?? 0;
    const endWidth = measureEndRef.current?.offsetWidth ?? startWidth;

    if (caretRef.current) {
      caretRef.current.style.left = `${baseLeftPx + startWidth - scrollLeft}px`;
    }
    if (selectionRef.current) {
      const left = baseLeftPx + startWidth - scrollLeft;
      const width = Math.max(0, endWidth - startWidth);
      selectionRef.current.style.left = `${left}px`;
      selectionRef.current.style.width = `${width}px`;
      selectionRef.current.style.opacity = width > 0 ? '1' : '0';
    }
  };

  useEffect(() => { updateCaretAndSelection(); }, [input]);

  // Update braille spinner and status while busy (with delays)
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

    // 100ms delay before spinner starts moving
    spinnerStartTimeoutRef.current = window.setTimeout(() => {
      // set initial frame, then start spinning
      setSpinnerChar(spinnerFrames.current[spinnerIndexRef.current]);
      spinnerIntervalRef.current = window.setInterval(() => {
        spinnerIndexRef.current =
          (spinnerIndexRef.current + 1) % spinnerFrames.current.length;
        setSpinnerChar(spinnerFrames.current[spinnerIndexRef.current]);
      }, 80);
    }, 100);

    // 500ms delay before loading texts appear; only if streaming hasn't begun
    textStartTimeoutRef.current = window.setTimeout(() => {
      if (startedStreamingRef.current) return;
      setStatusText(loadingTexts.current[0]);
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
        textIdx = (textIdx + 1) % loadingTexts.current.length;
        setStatusText(loadingTexts.current[textIdx]);
      }, 1500);
    }, 500);

    return () => clearAll();
  }, [busy]);

  // Hide loading text immediately when streaming begins
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




  const clear = () => {
    setLines([[]]);
    totalCharsRef.current = 0;
  };

  async function send(msg: string) {
    setBusy(true);
    setStartedStreaming(false);
    startedStreamingRef.current = false;
    appendNewline();
    appendText(`> ${msg}`);
    appendNewline();
    
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch('/api/chat?protocol=data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: msg }] }),
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      appendRaghuPrefix();
      appendText(' ');
      let streamStarted = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!streamStarted) {
          streamStarted = true;
          startedStreamingRef.current = true;
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
            } catch {}
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
      // ensure focus returns to input after streaming completes
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  // No intro dismissal; intro content remains at top of the scroll area

  return (
    <div className="shell">
      <div className="window">
        <div className="titlebar">
          <div className="nav-left">
            <GitIcon />
            github
          </div>
          <div className="nav-right">
            <LinkedInIcon />
            linkedin
          </div>
        </div>
        <div className="term">
          <div className="intro-block" aria-hidden="false">
            <pre id="banner-large">{BANNER_large}</pre>
            <pre id="banner-small">{BANNER_small}</pre>
            <div className="help">  
              <div className="col">
                <span className="cmd">Type to start</span>
                <span className="desc">Enter to send</span>
              </div>
              <div className="col">
                <span className="cmd">Ctrl+C</span>
                <span className="desc">abort streaming</span>
              </div>
              <div className="col">
                <span className="cmd">Ctrl+L</span>
                <span className="desc">clear screen</span>
              </div>
              <div className="col">
                <span className="cmd">↑/↓</span>
                <span className="desc">history</span>
              </div>
            </div>
          </div>

          <pre ref={outRef} className="stream" aria-live="polite">
            {lines.map((segments, lineIndex) => (
              <span key={lineIndex}>
                {segments.map((segment, segmentIndex) => (
                  <span key={segmentIndex}>{segment}</span>
                ))}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </pre>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            history.current.unshift(input);
            histIdx.current = -1;
            const toSend = input;
            setInput('');
            send(toSend);
          }}
          className="row"
        >
          <div className="box">
            <span className="prompt">{busy ? <span className="braille" aria-hidden>{spinnerChar || '⠋'}</span> : '>'}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                // update caret on navigation keys before React updates value
                requestAnimationFrame(updateCaretAndSelection);
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (history.current.length) {
                    histIdx.current = Math.min(histIdx.current + 1, history.current.length - 1);
                    setInput(history.current[histIdx.current]);
                  }
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (histIdx.current > 0) {
                    histIdx.current -= 1;
                    setInput(history.current[histIdx.current]);
                  } else {
                    histIdx.current = -1;
                    setInput('');
                  }
                  return;
                }
                if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                  e.preventDefault();
                  clear();
                  return;
                }
                if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                  e.preventDefault();
                  setInput('');
                  return;
                }
                if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                  e.preventDefault();
                  if (busy) {
                    controllerRef.current?.abort();
                    setBusy(false);
                  }
                  return;
                }
              }}
              onClick={updateCaretAndSelection}
              onKeyUp={updateCaretAndSelection}
              onFocus={updateCaretAndSelection}
              className="inp"
              placeholder={busy && !startedStreaming && statusText ? statusText : 'ask anything…'}
              autoFocus
              disabled={busy}
              spellCheck={false}              
            />
            <span ref={measureStartRef} className="measure measure-start" aria-hidden>{input}</span>
            <span ref={measureEndRef} className="measure measure-end" aria-hidden>{input}</span>
            {!busy ? (
              <span ref={caretRef} className="fat-caret" />
            ) : (
              <span ref={caretRef} className="ghost-caret" />
            )}
            <span ref={selectionRef} className="sel" />
          </div>
        </form>
      </div>

      <style jsx>{`
        /* Gruvbox Dark palette as CSS vars (scoped) */
        .shell {
          --bg0: #282828;
          --bg1: #3c3836;
          --bg:  #1d2021;
          --fg:  #ebdbb2;
          --muted: #a89984;
          --blue: #83a598;
          --aqua: #8ec07c;
          --yellow: #fabd2f;
          --orange: #fe8019;
          --red: #fb4934;
          --purple: #d3869b;

          min-height: 100dvh;
          padding: 24px;
          background: radial-gradient(1200px 600px at 0% -10%, var(--bg) 0%, #0f1112 60%);
          color: var(--fg);
        }
        .window {
          position: relative;
          display: grid;
          grid-template-rows: 36px 1fr auto;
          max-width: 980px;
          height: calc(100dvh - 48px);
          margin: 0 auto;
          border: 1px solid var(--bg1);
          border-radius: 12px;
          background: var(--bg0);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }
        .titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          background: linear-gradient(180deg, var(--bg0), var(--bg));
          border-bottom: 1px solid var(--bg1);
          user-select: none;
        }
        .nav-left { display: flex; align-items: center; }
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .title {
          font-weight: 700;
          color: var(--yellow);
          letter-spacing: 0.3px;
          text-transform: lowercase;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          font: 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;          
          color: var(--muted);
          text-decoration: none;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .nav-btn:hover {
          color: var(--fg);
          background: rgba(255,255,255,0.05);
        }
        .nav-btn.deploy {
          background: var(--yellow);
          color: var(--bg);
        }
        .nav-btn.deploy:hover {
          background: rgb(250, 208, 46);
          color: var(--bg);
        }
        .braille { color: var(--aqua); font-weight: 800; letter-spacing: 1px; display: inline-block; min-width: 1ch; }
        .idle { color: var(--muted); }

        /* Intro lives inside scroll now */
        .intro-block { padding: 8px 6px 14px 6px; display: grid; place-items: center; }
        @media (max-width: 768px) {
          .intro-block { padding: 4px 3px 8px 3px; }
        }
        .banner {
          margin: 0;
          white-space: pre;
          color: var(--blue);
          text-shadow: 0 0 18px rgba(131,165,152,.15);
          font: 14px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          color: #cdd6f4;
          text-align: center;
          line-height: 1;
          background-image: linear-gradient(45deg, #f5c2e7, #89b4fa);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }      
        .help {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, max-content);
          gap: 14px 24px;
          align-items: baseline;
        }
        @media (max-width: 768px) {
          .help {
            margin-top: 8px;
            grid-template-columns: repeat(2, max-content);
            gap: 8px 16px;
            font-size: 12px;
          }
        }
        .cmd { color: var(--orange); font-weight: 600; }
        .desc { color: var(--muted); margin-left: 8px; }

        .term { 
          margin: 0; padding: 18px; overflow: auto; background: var(--bg0); color: var(--fg);
          -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overscroll-behavior: contain;
          /* Custom scrollbar */
          scrollbar-width: thin;
          scrollbar-color: rgb(243, 196, 27) #1a1d1e;
        }
        .term::-webkit-scrollbar { width: 8px; }
        .term::-webkit-scrollbar-track { background: #1a1d1e; border-radius: 4px; }
        .term::-webkit-scrollbar-thumb { background: rgb(243, 196, 27); border-radius: 4px; }
        .term::-webkit-scrollbar-thumb:hover { background: rgb(250, 208, 46); }
        .stream { margin: 0; white-space: pre-wrap; word-break: break-word; font: 13.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .2px; }

        .row { padding: 10px; background: var(--bg0); border-top: 0px solid var(--bg1); }
        .box {
          position: relative;
          display: flex;
          align-items: center;
          background: #232728;
          border: 1px solid var(--bg1);
          border-radius: 3px;
          padding: 4px 4px;
          border-color: rgb(243, 196, 27);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .prompt {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgb(243, 196, 27);
          font-weight: 700;
          pointer-events: none;
        }
        .inp {
          flex: 1;
          background: transparent;
          color: var(--fg);
          border: 0;
          padding-left: 22px; /* space for prompt */
          outline: none;
          font: inherit;
          caret-color: transparent; /* hide native caret */
        }
        .inp::placeholder { color: var(--muted); }
        .inp:focus { background: #1f2324; }
        .measure { position: absolute; left: 34px; top: 50%; transform: translateY(-50%); white-space: pre; font: inherit; color: transparent; pointer-events: none; }
        .measure-end { visibility: hidden; }
        .sel { position: absolute; top: 7px; height: calc(100% - 14px); background: rgba(250, 189, 47, 0.25); border: 1px solid rgba(250, 189, 47, 0.35); border-radius: 2px; opacity: 0; pointer-events: none; }
        .hint { margin-top: 6px; color: var(--muted); font-size: 12px; }
        .key { display: inline-block; padding: 1px 6px; border: 1px solid var(--bg1); border-radius: 6px; margin-right: 6px; color: var(--fg); background: #222; }
        #banner-small {
            display: none; /* Hide the small banner by default */
        }
        .fat-caret { position: absolute; top: 50%; transform: translateY(-50%); display: inline-block; background-color: rgb(243, 196, 27); width: 8px; height: 1.2em; animation: blink 1s steps(1) infinite; border-radius: 1px; }
        .ghost-caret { position: absolute; top: 50%; transform: translateY(-50%); display: inline-block; background-color: transparent; width: 8px; height: 1.2em; border-radius: 1px; }

        :global(.raghu-prefix) { color: rgb(243, 196, 27); font-weight: 700; }

        /* Define the blinking animation */
        @keyframes blink {
          0%   { opacity: 1; }
          49%  { opacity: 1; }
          50%  { opacity: 0; }
          100% { opacity: 0; }
        }

        #banner-large {
            display: block; /* Show the large banner by default */
            margin: 0;
            white-space: pre;
            text-shadow: 0 0 18px rgba(134, 109, 10, 0.34);
            font: 14px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color:rgb(244, 243, 205);
            text-align: center;
            line-height: 1;
            background-image: linear-gradient(45deg,rgb(245, 238, 194),rgb(243, 196, 27));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        @media (max-width: 768px) {
            #banner-large {
                display: none; /* Hide the large banner on small screens */
            }

            #banner-small {
                display: block; /* Show the small banner by default */
                margin: 0;
                white-space: pre;
                text-shadow: 0 0 18px rgba(134, 109, 10, 0.34);
                font: 14px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                color:rgb(244, 243, 205);
                text-align: center;
                line-height: 1;
                background-image: linear-gradient(45deg,rgb(245, 238, 194),rgb(243, 196, 27));
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
            }
        }

      `}</style>
    </div>
  );
}