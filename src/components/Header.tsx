interface HeaderProps {
  isHalted: boolean;
}

export function Header({ isHalted }: HeaderProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-[#1a3a1a] bg-[#0d1a0d] shrink-0">
      <h1 className="font-['Orbitron'] text-base font-black text-[#00ff41] tracking-[3px] [text-shadow:0_0_20px_#00ff41]">
        Z80 ASM LAB
      </h1>
      <span className="text-[#4a7a4a] text-[11px] tracking-wider">
        ZILOG Z80 · INTERACTIVE LEARNING ENVIRONMENT
      </span>
      <div className="flex-1" />
      {isHalted && (
        <span className="px-2 py-0.5 border border-[#ffb000] text-[#ffb000] text-[10px] animate-[blink_1s_infinite]">
          HALTED
        </span>
      )}
      <span className="px-2 py-0.5 border border-[#00a028] text-[#00a028] text-[10px] tracking-wider">
        v1.0
      </span>
    </header>
  );
}
