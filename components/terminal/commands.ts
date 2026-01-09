import type { Command, CommandResult } from './types';
import { CONTENT } from './content';

// === COMMAND DEFINITIONS ===

const commands: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    aliases: ['?', 'commands'],
    shortcut: false,
    handler: () => ({ output: generateHelpText() }),
  },
  {
    name: 'whoami',
    description: 'Quick bio',
    aliases: ['about', 'bio'],
    shortcut: true,
    handler: () => ({ output: CONTENT.BIO }),
  },
  {
    name: 'now',
    description: 'What I\'m currently working on',
    aliases: ['current'],
    shortcut: true,
    handler: () => ({ output: CONTENT.NOW }),
  },
  {
    name: 'projects',
    description: 'Notable projects',
    aliases: ['work', 'portfolio'],
    shortcut: true,
    handler: () => ({ output: CONTENT.PROJECTS }),
  },
  {
    name: 'skills',
    description: 'Technical skills & tools',
    aliases: ['tech', 'stack'],
    shortcut: false,
    handler: () => ({ output: CONTENT.SKILLS }),
  },
  {
    name: 'contact',
    description: 'How to reach me',
    aliases: ['social', 'links'],
    shortcut: true,
    handler: () => ({ output: CONTENT.CONTACT }),
  },
  {
    name: 'education',
    description: 'Education & experience',
    aliases: ['edu', 'experience', 'exp'],
    shortcut: false,
    handler: () => ({ output: CONTENT.EDUCATION }),
  },
  {
    name: 'resume',
    description: 'Open resume PDF',
    aliases: ['cv'],
    shortcut: false,
    handler: () => ({
      output: '  Opening resume...',
      action: { type: 'open-url', url: '/resume.pdf' },
    }),
  },
  {
    name: 'clear',
    description: 'Clear terminal history',
    aliases: ['cls', 'reset'],
    shortcut: false,
    handler: () => ({
      output: '',
      action: { type: 'clear' },
    }),
  },
  {
    name: 'github',
    description: 'Open GitHub profile',
    shortcut: false,
    handler: () => ({
      output: '  Opening GitHub...',
      action: { type: 'open-url', url: 'https://github.com/raghunandan-r' },
    }),
  },
  {
    name: 'linkedin',
    description: 'Open LinkedIn profile',
    shortcut: false,
    handler: () => ({
      output: '  Opening LinkedIn...',
      action: { type: 'open-url', url: 'https://www.linkedin.com/in/raghudan/' },
    }),
  },
];

// === REGISTRY (built once at module load) ===

const commandMap = new Map<string, Command>();

for (const cmd of commands) {
  commandMap.set(cmd.name.toLowerCase(), cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      commandMap.set(alias.toLowerCase(), cmd);
    }
  }
}

// Pre-computed shortcut list (static, no runtime filtering)
export const shortcutCommands: Command[] = commands.filter(cmd => cmd.shortcut);

// === PUBLIC FUNCTIONS ===

/**
 * Find a command by name or alias (case-insensitive)
 */
export function findCommand(input: string): Command | null {
  const normalized = input.trim().toLowerCase();
  return commandMap.get(normalized) || null;
}

/**
 * Get all commands for help display
 */
export function getAllCommands(): Command[] {
  return commands;
}

/**
 * Generate help text from command registry
 */
function generateHelpText(): string {
  let output = '\n  Available Commands\n\n';

  for (const cmd of commands) {
    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
    output += `  › ${cmd.name.padEnd(12)} ${cmd.description}${aliases}\n`;
  }

  return output;
}

/**
 * Execute a command action (side effects like opening URLs)
 */
export function executeAction(action: CommandResult['action']): void {
  if (!action || action.type === 'none') return;

  switch (action.type) {
    case 'open-url':
      window.open(action.url, '_blank', 'noopener,noreferrer');
      break;
    case 'copy':
      navigator.clipboard.writeText(action.text);
      break;
    // 'clear' is handled in the router, not here
  }
}

// === FUZZY MATCHING ===

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar commands for "did you mean?" suggestions
 * @param input User input
 * @param maxDistance Maximum edit distance (default 2)
 * @returns Array of similar command names, sorted by relevance
 */
export function findSimilarCommands(input: string, maxDistance = 2): string[] {
  const normalized = input.trim().toLowerCase();
  const suggestions: Array<{ name: string; distance: number }> = [];
  const seen = new Set<string>();

  for (const cmd of commands) {
    // Check command name
    const nameDistance = levenshtein(normalized, cmd.name.toLowerCase());
    if (nameDistance <= maxDistance && !seen.has(cmd.name)) {
      suggestions.push({ name: cmd.name, distance: nameDistance });
      seen.add(cmd.name);
    }

    // Check aliases
    for (const alias of cmd.aliases || []) {
      const aliasDistance = levenshtein(normalized, alias.toLowerCase());
      if (aliasDistance <= maxDistance && !seen.has(cmd.name)) {
        suggestions.push({ name: cmd.name, distance: aliasDistance });
        seen.add(cmd.name);
      }
    }

    // Check prefix match (e.g., "proj" matches "projects")
    if (cmd.name.toLowerCase().startsWith(normalized) && normalized.length >= 2 && !seen.has(cmd.name)) {
      suggestions.push({ name: cmd.name, distance: 0 });
      seen.add(cmd.name);
    }
  }

  return suggestions
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(s => s.name);
}
