// components/terminal.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GitIcon, LinkedInIcon, GmailIcon } from '@/components/icons';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';

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

type SerializableSegment = string | { type: 'prefix' };
type SerializableLine = SerializableSegment[];

export default function Terminal() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLPreElement>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [spinnerChar, setSpinnerChar] = useState<string>('');
  const [lines, setLines] = useState<SerializableLine[]>([]);
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
  const threadIdRef = useRef<string | null>(null);
  const yearsSince2013 = useMemo(() => {
    const start = new Date('2013-08-13T00:00:00Z');
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const years = (diffMs / (1000 * 60 * 60 * 24 * 365.2425))-2.5;
    return years.toFixed(1);
  }, []);

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
      let newLines = JSON.parse(JSON.stringify(currentLines));
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

  const updateCaretAndSelection = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const selStart = inputEl.selectionStart ?? inputEl.value.length;
    const selEnd = inputEl.selectionEnd ?? selStart;
    const baseLeftPx = 25; // magic number issue. needs fixing
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
    }, 1000);

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

  // Get or create a thread_id on component mount
  useEffect(() => {
    // Load chat history from localStorage
    try {
      const storedLines = localStorage.getItem('terminal_history');
      if (storedLines) {
        const parsedLines: SerializableLine[] = JSON.parse(storedLines);
        setLines(parsedLines);
        let charCount = 0;
        for (const line of parsedLines) {
          for (const segment of line) {
            if (typeof segment === 'string') {
              charCount += segment.length;
            }
          }
        }
        totalCharsRef.current = charCount;
      }
    } catch (e) {
      console.error("Failed to load terminal history:", e);
      localStorage.removeItem('terminal_history');
    }

    const storedThreadId = localStorage.getItem('thread_id');
    if (storedThreadId) {
      threadIdRef.current = storedThreadId;
    } else {
      const newThreadId = crypto.randomUUID();
      threadIdRef.current = newThreadId;
      localStorage.setItem('thread_id', newThreadId);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (lines.length > 0 && (lines.length > 1 || lines[0].length > 0)) {
      localStorage.setItem('terminal_history', JSON.stringify(lines));
    }
  }, [lines]);


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
        body: JSON.stringify({ 
          messages: [{ 
            role: 'user', 
            content: msg, 
            thread_id: threadIdRef.current 
          }] 
        }),
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
          <nav className="nav">
            <a href="https://github.com/raghunandan-r" target="_blank" className="social-link">
              <GitIcon />
              github
            </a>
            <a href="mailto:raghunandan092@gmail.com" target="_blank" className="social-link">
              <GmailIcon />
              mail
            </a>
            <a href="https://www.linkedin.com/in/raghudan/" target="_blank"   className="social-link">
              <LinkedInIcon />
              linkedin
            </a>
          </nav>
        </div>
        <div className="term">
          <div className="intro-block" aria-hidden="false">
            <pre id="banner-large">{BANNER_large}</pre>
            <pre id="banner-small">{BANNER_small}</pre>
            <div className="help">  
              <div className="col intro">
                <p className="intro-line">Hi, I&apos;m based in nyc.</p>
                <p className="intro-line">I&apos;ve been building things for {yearsSince2013} years.</p>

                <p className="intro-section"><strong>I&apos;m currently...</strong></p>
                <ul className="intro-list">
                  <li>volunteering at <a href="https://chieac.org/chicagodatascience" target="_blank" className="intro-link">CHIEAC</a> as a data scientist, helping build a GenAI tool for the community</li>
                </ul>

                <p className="intro-section"><strong>Previously I...</strong></p>
                <ul className="intro-list">
                  <li>graduated from <a href="https://www.rit.edu/" target="_blank" className="intro-link">Rochester Institute of Technology</a> with a MSc in Data Science</li>
                  <li>built data tools for RevOps at <a href="https://www.micron.com/" target="_blank" className="intro-link">Micron</a></li>
                  <li>worked on b2b SaaS at <a href="https://www.freshworks.com/" target="_blank" className="intro-link">Freshworks</a></li>
                  <li>worked on hyperlocal delivery at <a href="https://www.lynk.co.in/" target="_blank" className="intro-link">Lynk</a></li>
                  <li>worked on FinTech at <a href="https://www.bankbazaar.com/" target="_blank" className="intro-link">Bankbazaar</a>, building integrations for Tech &amp; Ops</li>
                  <li>started out as a Developer at <a href="https://www.dxc.com/" target="_blank" className="intro-link">DXC</a></li>
                </ul>

                <p className="intro-section"><strong>Projects I&apos;m working on...</strong></p>
                <ul className="intro-list">
                  <li><a href="https://raghu.fyi" target="_blank" className="intro-link">raghu.fyi</a> - website to talk about my work, built with Next.js</li>
                  <li><a href="https://github.com/raghunandan-r/chatRaghu-backend" target="_blank" className="intro-link">chatRaghu</a> - backend engine with RAG, built with FastAPI, OpenAI &amp; Pinecone</li>
                  <li><a href="https://github.com/raghunandan-r/chatraghu-gcp-elt-pipeline" target="_blank" className="intro-link">chatRaghu_elt</a> - real-time evals built with GCP, BigQuery, dbt &amp; Hex</li>
                </ul>
                <p className="intro-section"><strong>Questions? Ask away!</strong></p>
              </div>
              <div className="col">
                <span className="cmd">Type to start</span>
                <span className="desc">Enter to send</span>
              </div>
              <div className="col">
                <span className="cmd">↑/↓</span>
                <span className="desc">history</span>
              </div>
            </div>
          </div>

          <pre ref={messagesContainerRef} className="stream" aria-live="polite">
            {lines.map((segments, lineIndex) => (
              <span key={lineIndex}>
                {segments.map((segment, segmentIndex) => (
                  typeof segment === 'string'
                    ? <span key={segmentIndex}>{segment}</span>
                    : <span key={segmentIndex} className="raghu-prefix">raghu &gt; </span>
                ))}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
            <div ref={messagesEndRef} />
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
              enterKeyHint="send"
              onKeyDown={(e) => {
                // update caret on navigation keys before React updates value
                requestAnimationFrame(updateCaretAndSelection);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!busy && input.trim()) {
                    history.current.unshift(input);
                    histIdx.current = -1;
                    const toSend = input;
                    setInput('');
                    send(toSend);
                  }
                  return;
                }
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
                if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                  e.preventDefault();
                  setInput('');
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
          background: radial-gradient(1200px 600px at 0% -10%, var(--bg) 0%, var(--bg0) 60%);
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
          justify-content: center;
          padding: 0 12px;
          background: linear-gradient(180deg, var(--bg0), var(--bg));
          border-bottom: 1px solid var(--bg1);
          user-select: none;
        }
        .nav { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .social-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          font: 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          color: var(--muted);
          text-decoration: none;
          border-radius: 6px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        .social-link:hover {
          color: var(--fg);
          background: var(--bg1);
          border-color: var(--yellow);
          transform: translateY(-1px);
        }
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
          font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;          
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
          background: #fabd2f;
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
          font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px 24px;
          align-items: baseline;
        }
        .intro { max-width: 820px; text-align: left; color: var(--fg); }
        .intro-line { margin: 2px 0; color: var(--fg); }
        .intro-section { margin: 10px 0 6px; color: var(--fg); }
        .intro-section strong { font-weight: 700; }
        .intro-list { list-style: none; padding: 0; margin: 4px 0 10px; }
        .intro-list li { position: relative; padding-left: 14px; margin: 3px 0; }
        .intro-list li::before { content: '›'; position: absolute; left: 0; top: 0; color: var(--yellow); }
        .intro-link { color: var(--fg); text-decoration: none; border-bottom: 3px dashed var(--bg1); text-underline-offset: 5px; }
        .intro-link:hover { color: var(--yellow); border-bottom-color: var(--yellow); }
        @media (max-width: 768px) {
          .help {
            margin-top: 8px;
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
          scrollbar-color: var(--yellow) var(--bg1);
        }
        .term::-webkit-scrollbar { width: 8px; }
        .term::-webkit-scrollbar-track { background: var(--bg1); border-radius: 4px; }
        .term::-webkit-scrollbar-thumb { background: #fabd2f; border-radius: 4px; }
        .term::-webkit-scrollbar-thumb:hover { background: #fabd2f; }
        .stream { margin: 0; white-space: pre-wrap; word-break: break-word; font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .2px; }

        .row { padding: 10px; background: var(--bg0); border-top: 0px solid var(--bg1); }
        .box {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg0);
          border: 1px solid var(--bg1);
          border-radius: 3px;
          padding: 4px 4px;
          border-color: #fabd2f;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .prompt {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #fabd2f;
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
        .inp:focus { background: var(--bg1); }
        .measure { position: absolute; left: 34px; top: 50%; transform: translateY(-50%); white-space: pre; font: inherit; color: transparent; pointer-events: none; }
        .measure-end { visibility: hidden; }
        .sel { position: absolute; top: 7px; height: calc(100% - 14px); background: rgba(250, 189, 47, 0.25); border: 1px solid rgba(250, 189, 47, 0.35); border-radius: 2px; opacity: 0; pointer-events: none; }
        .hint { margin-top: 6px; color: var(--muted); font-size: 12px; }
        .key { display: inline-block; padding: 1px 6px; border: 1px solid var(--bg1); border-radius: 6px; margin-right: 6px; color: var(--fg); background: var(--bg0); }
        #banner-small {
            display: none; /* Hide the small banner by default */
        }
        .fat-caret { position: absolute; top: 50%; transform: translateY(-50%); display: inline-block; background-color: rgb(243, 196, 27); width: 8px; height: 1.2em; animation: blink 1s steps(1) infinite; border-radius: 1px; }
        .ghost-caret { position: absolute; top: 50%; transform: translateY(-50%); display: inline-block; background-color: transparent; width: 8px; height: 1.2em; border-radius: 1px; }

        :global(.raghu-prefix) { color: #fabd2f; font-weight: 700; }

        /* Define the blinking animation */
        @keyframes blink {
          0%   { opacity: 1; }
          49%  { opacity: 1; }
          50%  { opacity: 0; }
          100% { opacity: 0; }
        }

        #banner-large, #banner-small {
            max-width: 100%;
            overflow-x: auto;
            scrollbar-width: none; /* Firefox */
        }

        #banner-large::-webkit-scrollbar, #banner-small::-webkit-scrollbar {
            display: none; /* Safari and Chrome */
        }

        #banner-large {
            display: block; /* Show the large banner by default */
            margin: 0;
            white-space: pre;
            text-shadow: 0 0 18px rgba(134, 109, 10, 0.34);
            font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color:rgb(244, 243, 205);
            text-align: center;
            line-height: 1;
            background-image: linear-gradient(45deg,var(--purple), var(--yellow));
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
                font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                color:rgb(244, 243, 205);
                text-align: center;
                line-height: 1;
                background-image: linear-gradient(45deg,var(--purple), var(--yellow));
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
            }
        }

      `}</style>
    </div>
  );
}