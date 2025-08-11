export type PendingNode =
  | { type: 'text'; value: string }
  | { type: 'prefix' }
  | { type: 'newline' };

export type SerializableSegment = string | { type: 'prefix' };
export type SerializableLine = SerializableSegment[];


