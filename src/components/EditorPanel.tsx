import { useRef, useEffect } from 'react';

interface EditorPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onRunTests: () => void;
  onLoadExample: (name: string) => void;
  maxSteps: number;
  onMaxStepsChange: (v: number) => void;
}

const EXAMPLES = ['hello', 'loop', 'fibonacci', 'sort'];

export function EditorPanel({
  code, onCodeChange, onRun, onStep, onReset, onRunTests, onLoadExample, maxSteps, onMaxStepsChange,
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  useEffect(() => {
    const ta = textareaRef.current;
    const ln = lineNumRef.current;
    if (!ta || !ln) return;
    const sync = () => { ln.scrollTop = ta.scrollTop; };
    ta.addEventListener('scroll', sync);
    return () => ta.removeEventListener('scroll', sync);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart, end = ta.selectionEnd;
      const newVal = ta.value.substring(0, s) + '    ' + ta.value.substring(end);
      onCodeChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + 4;
      });
    }
  };

  return (
    <div className="bg-[#0d1a0d] flex flex-col overflow-hidden animate-[flicker_8s_infinite]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a3a1a] text-[#00a028] text-[11px] tracking-[2px] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41]" />
        ASSEMBLY SOURCE
        <div className="flex gap-1.5 ml-auto">
          {EXAMPLES.map(name => (
            <button
              key={name}
              onClick={() => onLoadExample(name)}
              className="px-2 py-0.5 border border-[#1a3a1a] bg-transparent text-[#4a7a4a] font-['Share_Tech_Mono'] text-[10px] cursor-pointer tracking-[0.5px] hover:border-[#00a028] hover:text-[#00ff41]"
            >
              {name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={lineNumRef}
          className="py-3 px-2 pl-3 text-[#4a7a4a] text-right select-none min-w-[40px] text-[12px] leading-[1.6] overflow-hidden bg-black/20 border-r border-[#1a3a1a] whitespace-pre"
        >
          {lineNumbers}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => onCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent border-none outline-none text-[#00ff41] font-['Share_Tech_Mono'] text-[13px] leading-[1.6] px-4 py-3 resize-none caret-[#00ff41] overflow-y-auto whitespace-pre tab-[8] selection:bg-[#003a10]"
        />
      </div>

      <div className="flex gap-2 px-4 py-2 border-t border-[#1a3a1a] items-center shrink-0">
        <button
          onClick={onRun}
          className="px-3.5 py-1 border border-[#00ff41] bg-[#003a10] text-[#00ff41] font-['Share_Tech_Mono'] text-[12px] cursor-pointer tracking-wider hover:bg-[#005020] hover:shadow-[0_0_12px_#00a028]"
        >
          ▶ RUN
        </button>
        <button
          onClick={onStep}
          className="px-3.5 py-1 border border-[#00a028] bg-transparent text-[#00ff41] font-['Share_Tech_Mono'] text-[12px] cursor-pointer tracking-wider hover:bg-[#003a10] hover:border-[#00ff41]"
        >
          STEP
        </button>
        <button
          onClick={onReset}
          className="px-3.5 py-1 border border-[#00a028] bg-transparent text-[#00ff41] font-['Share_Tech_Mono'] text-[12px] cursor-pointer tracking-wider hover:bg-[#003a10] hover:border-[#00ff41]"
        >
          RESET
        </button>
        <button
          onClick={onRunTests}
          className="px-3.5 py-1 border border-[#ffb000] bg-transparent text-[#ffb000] font-['Share_Tech_Mono'] text-[12px] cursor-pointer tracking-wider hover:bg-[#3a2800]"
        >
          ▶ RUN TESTS
        </button>
        <span className="text-[#4a7a4a] text-[11px] ml-2">MAX STEPS:</span>
        <select
          value={maxSteps}
          onChange={e => onMaxStepsChange(parseInt(e.target.value))}
          className="px-2 py-1 border border-[#00a028] bg-transparent text-[#00ff41] font-['Share_Tech_Mono'] text-[12px] cursor-pointer tracking-wider hover:bg-[#003a10] hover:border-[#00ff41] outline-none"
        >
          <option value="1000">1K</option>
          <option value="10000">10K</option>
          <option value="100000">100K</option>
          <option value="1000000">1M</option>
        </select>
      </div>
    </div>
  );
}
