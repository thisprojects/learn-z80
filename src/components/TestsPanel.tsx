interface TestsPanelProps {
  tests: string;
  onTestsChange: (v: string) => void;
}

export function TestsPanel({ tests, onTestsChange }: TestsPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a3a1a] text-[#00a028] text-[11px] tracking-[2px] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41]" />
        TESTS
        <span className="text-[#4a7a4a] text-[10px] ml-2">// assert register/memory values</span>
      </div>
      <textarea
        value={tests}
        onChange={e => onTestsChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        className="flex-1 bg-transparent border-none outline-none text-[#ffb000] font-['Share_Tech_Mono'] text-[12px] leading-[1.6] px-4 py-3 resize-none caret-[#ffb000] overflow-y-auto whitespace-pre selection:bg-[#3a2800]"
      />
    </div>
  );
}
