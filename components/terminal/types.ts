export type PendingNode =
  | { type: 'text'; value: string }
  | { type: 'prefix' }
  | { type: 'newline' };

export type SerializableSegment = string | { type: 'prefix' };
export type SerializableLine = SerializableSegment[];

// === COMMAND SYSTEM TYPES ===

export type CommandAction =
  | { type: 'none' }
  | { type: 'open-url'; url: string }
  | { type: 'clear' }
  | { type: 'copy'; text: string };

export type CommandResult = {
  output: string;
  action?: CommandAction;
};

export type Command = {
  name: string;
  description: string;
  aliases?: string[];
  shortcut?: boolean;
  handler: () => CommandResult;
};

