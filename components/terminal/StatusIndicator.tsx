'use client';

type Props = {
  backendEnabled: boolean;
  backendAvailable: boolean;
};

export default function StatusIndicator({ backendEnabled, backendAvailable }: Props) {
  const isOnline = backendEnabled && backendAvailable;

  return (
    <div className="status-indicator" title={isOnline ? 'AI available' : 'Commands only mode'}>
      <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
      <span className="status-text">{isOnline ? 'AI' : 'offline'}</span>

      <style jsx>{`
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          font-size: 10px;
          color: var(--muted);
          user-select: none;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot.online {
          background: var(--aqua);
          box-shadow: 0 0 4px var(--aqua);
        }

        .status-dot.offline {
          background: var(--muted);
        }

        .status-text {
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}
