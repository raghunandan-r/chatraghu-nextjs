'use client';

import { shortcutCommands } from './commands';

type Props = {
  onCommand: (commandName: string) => void;
  disabled?: boolean;
};

export default function CommandShortcuts({ onCommand, disabled }: Props) {
  return (
    <div className="command-shortcuts">
      {shortcutCommands.map((cmd) => (
        <button
          key={cmd.name}
          type="button"
          className="cmd-shortcut"
          onClick={() => onCommand(cmd.name)}
          disabled={disabled}
          title={cmd.description}
        >
          {cmd.name}
        </button>
      ))}
      <button
        type="button"
        className="cmd-shortcut cmd-shortcut-help"
        onClick={() => onCommand('help')}
        disabled={disabled}
        title="Show all commands"
      >
        ?
      </button>

      <style jsx>{`
        .command-shortcuts {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 12px;
          background: var(--bg0);
          border-top: 1px solid var(--bg1);
          flex-wrap: wrap;
        }

        .cmd-shortcut {
          padding: 6px 14px;
          background: transparent;
          border: 1px solid var(--bg1);
          border-radius: 4px;
          color: var(--muted);
          font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .cmd-shortcut:hover:not(:disabled) {
          background: var(--bg1);
          color: var(--fg);
          border-color: var(--yellow);
          transform: translateY(-1px);
        }

        .cmd-shortcut:active:not(:disabled) {
          transform: translateY(0);
          background: var(--yellow);
          color: var(--bg0);
          border-color: var(--yellow);
        }

        .cmd-shortcut:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cmd-shortcut-help {
          padding: 6px 10px;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .command-shortcuts {
            gap: 6px;
            padding: 6px 8px 10px;
          }

          .cmd-shortcut {
            padding: 5px 10px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
