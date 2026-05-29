import { useEffect, useRef } from 'react';

export interface LogEntry {
  msg: string;
  cls: 'info' | 'ok' | 'err' | 'warn' | 'test-pass' | 'test-fail';
}

interface ConsoleOutputProps {
  logs: LogEntry[];
  onClear: () => void;
}

const clsToTw: Record<LogEntry['cls'], string> = {
  info: 'text-[#4a7a4a]',
  ok: 'text-[#00ff41]',
  err: 'text-[#ff3333]',
  warn: 'text-[#ffb000]',
  'test-pass': 'text-[#00ff41]',
  'test-fail': 'text-[#ff3333]',
};

export function ConsoleOutput({ logs, onClear }: ConsoleOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col border-r border-[#1a3a1a] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a3a1a] text-[#00a028] text-[11px] tracking-[2px] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41]" />
        CONSOLE OUTPUT
        <button
          onClick={onClear}
          className="ml-auto px-2 py-px border border-[#00a028] bg-transparent text-[#00ff41] font-['Share_Tech_Mono'] text-[10px] cursor-pointer hover:bg-[#003a10] hover:border-[#00ff41]"
        >
          CLR
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-[1.7]"
      >
        {logs.map((entry, i) => (
          <div key={i} className={clsToTw[entry.cls]}>
            {entry.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
