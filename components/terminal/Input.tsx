import React, { useEffect } from 'react';

type CaretRefs = {
  inputRef: React.RefObject<HTMLInputElement>;
  measureStartRef: React.RefObject<HTMLSpanElement>;
  measureEndRef: React.RefObject<HTMLSpanElement>;
  caretRef: React.RefObject<HTMLSpanElement>;
  selectionRef: React.RefObject<HTMLSpanElement>;
};

type InputHistoryApi = {
  pushEntry: (text: string) => void;
  applyPrev: () => string | null;
  applyNext: () => string | null;
  clearInput: () => string;
};

type Props = {
  input: string;
  setInput: (v: string) => void;
  busy: boolean;
  spinnerChar: string;
  statusText: string;
  startedStreaming: boolean;
  onSubmit: (text: string) => void | Promise<void>;
  inputHistoryApi: InputHistoryApi;
  refsFromCaretHook: CaretRefs;
  updateCaretAndSelection: () => void;
};

export default function InputBar({
  input,
  setInput,
  busy,
  spinnerChar,
  statusText,
  startedStreaming,
  onSubmit,
  inputHistoryApi,
  refsFromCaretHook,
  updateCaretAndSelection,
}: Props) {
  const { inputRef, measureStartRef, measureEndRef, caretRef, selectionRef } = refsFromCaretHook;

  // Ensure caret is positioned correctly on mount before any user interaction
  useEffect(() => {
    updateCaretAndSelection();
  }, [updateCaretAndSelection]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!input.trim() || busy) return;
        inputHistoryApi.pushEntry(input);
        const toSend = input;
        setInput('');
        await onSubmit(toSend);
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
          onKeyDown={async (e) => {
            // update caret on navigation keys before React updates value
            requestAnimationFrame(updateCaretAndSelection);
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!busy && input.trim()) {
                inputHistoryApi.pushEntry(input);
                const toSend = input;
                setInput('');
                await onSubmit(toSend);
              }
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = inputHistoryApi.applyPrev();
              if (prev !== null) setInput(prev);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const next = inputHistoryApi.applyNext();
              if (next !== null) setInput(next);
              return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'u') {
              e.preventDefault();
              setInput(inputHistoryApi.clearInput());
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
  );
}


