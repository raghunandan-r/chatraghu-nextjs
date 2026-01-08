import { useCallback } from 'react';
import { findCommand, executeAction, findSimilarCommands } from '@/components/terminal/commands';

type RouterDeps = {
  appendText: (t: string) => void;
  appendPrefix: () => void;
  appendNewline: () => void;
  clear: () => void;
  send: (msg: string) => Promise<void>;
  backendAvailable: boolean;
  backendEnabled: boolean;
};

export function useCommandRouter(deps: RouterDeps) {
  const {
    appendText,
    appendPrefix,
    appendNewline,
    clear,
    send,
    backendAvailable,
    backendEnabled,
  } = deps;

  /**
   * Execute user input - routes to command or LLM
   */
  const execute = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      // 1. Check for predefined command
      const command = findCommand(trimmed);

      if (command) {
        // Echo user input for commands
        appendNewline();
        appendText(`> ${trimmed}`);
        appendNewline();

        const result = command.handler();

        // Handle clear action specially (clears everything)
        if (result.action?.type === 'clear') {
          clear();
          return;
        }

        // Display command output
        if (result.output) {
          appendPrefix();
          appendText(result.output);
          appendNewline();
        }

        // Execute side effects (open URL, copy, etc.)
        if (result.action) {
          executeAction(result.action);
        }

        return;
      }

      // 2. No command match - try LLM if available
      // Note: send() will echo the input, so we don't echo here
      if (backendEnabled && backendAvailable) {
        await send(trimmed);
        return;
      }

      // 3. Backend not available - show suggestions
      // Echo user input for "command not found" case
      appendNewline();
      appendText(`> ${trimmed}`);
      appendNewline();

      appendPrefix();
      const suggestions = findSimilarCommands(trimmed);

      if (suggestions.length > 0) {
        appendText(`  Command not found: "${trimmed}"\n`);
        appendText(`  Did you mean: ${suggestions.join(', ')}?\n`);
      } else {
        appendText(`  Command not found: "${trimmed}"\n`);
        appendText('  Type "help" to see available commands.\n');
      }

      if (!backendEnabled) {
        appendText('  (AI backend is currently disabled)\n');
      }

      appendNewline();
    },
    [appendText, appendPrefix, appendNewline, clear, send, backendAvailable, backendEnabled]
  );

  return { execute };
}
