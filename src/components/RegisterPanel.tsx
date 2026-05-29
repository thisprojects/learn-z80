import type { Z80 } from '../lib/z80';
import { fmtHex } from '../lib/testRunner';

export interface RegSnapshot {
  A: string; F: string;
  B: string; C: string;
  D: string; E: string;
  H: string; L: string;
  AF: string; BC: string; DE: string; HL: string;
  IX: string; IY: string; SP: string; PC: string;
  fS: number; fZ: number; fH: number; fPV: number; fN: number; fC: number;
  cycles: number;
}

export function snapshotCPU(cpu: Z80): RegSnapshot {
  return {
    A: fmtHex(cpu.A, 2), F: fmtHex(cpu.F, 2),
    B: fmtHex(cpu.B, 2), C: fmtHex(cpu.C, 2),
    D: fmtHex(cpu.D, 2), E: fmtHex(cpu.E, 2),
    H: fmtHex(cpu.H, 2), L: fmtHex(cpu.L, 2),
    AF: fmtHex(cpu.AF, 4), BC: fmtHex(cpu.BC, 4),
    DE: fmtHex(cpu.DE, 4), HL: fmtHex(cpu.HL, 4),
    IX: fmtHex(cpu.IX, 4), IY: fmtHex(cpu.IY, 4),
    SP: fmtHex(cpu.SP, 4), PC: fmtHex(cpu.PC, 4),
    fS: cpu.fS, fZ: cpu.fZ, fH: cpu.fH, fPV: cpu.fPV, fN: cpu.fN, fC: cpu.fC,
    cycles: cpu.cycles,
  };
}

interface RegisterPanelProps {
  regs: RegSnapshot;
  prevRegs: RegSnapshot | null;
}

const GROUPS: { label: string; keys: (keyof RegSnapshot)[] }[] = [
  { label: 'MAIN',  keys: ['A', 'F', 'B', 'C', 'D', 'E', 'H', 'L'] },
  { label: 'PAIRS', keys: ['AF', 'BC', 'DE', 'HL'] },
  { label: 'INDEX', keys: ['IX', 'IY', 'SP', 'PC'] },
];

const FLAGS = ['S', 'Z', 'H', 'PV', 'N', 'C'] as const;
type FlagKey = 'fS' | 'fZ' | 'fH' | 'fPV' | 'fN' | 'fC';
const FLAG_KEYS: FlagKey[] = ['fS', 'fZ', 'fH', 'fPV', 'fN', 'fC'];

export function RegisterPanel({ regs, prevRegs }: RegisterPanelProps) {
  return (
    <div className="bg-[#0d1a0d] flex flex-col overflow-hidden animate-[flicker_8s_infinite]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a3a1a] text-[#00a028] text-[11px] tracking-[2px] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shadow-[0_0_6px_#00ff41]" />
        REGISTERS
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {GROUPS.map(({ label, keys }) => (
          <div key={label} className="mb-3">
            <div className="text-[#4a7a4a] text-[10px] tracking-[2px] mb-1 pb-0.5 border-b border-[#1a3a1a]">
              {label}
            </div>
            {keys.map(k => {
              const val = regs[k] as string;
              const changed = prevRegs !== null && (prevRegs[k] as string) !== val;
              return (
                <div key={k} className="flex justify-between items-center py-0.5 px-1 my-px">
                  <span className="text-[#4a7a4a] text-[11px] min-w-[28px]">{String(k)}</span>
                  <span
                    className={`text-[12px] text-right transition-all duration-200 ${
                      changed
                        ? 'text-[#ffb000] [text-shadow:0_0_8px_#ffb000]'
                        : 'text-[#00ff41]'
                    }`}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="mb-3">
          <div className="text-[#4a7a4a] text-[10px] tracking-[2px] mb-1 pb-0.5 border-b border-[#1a3a1a]">
            FLAGS
          </div>
          <div className="flex gap-1 flex-wrap p-1">
            {FLAGS.map((f, i) => {
              const set = regs[FLAG_KEYS[i]] === 1;
              return (
                <span
                  key={f}
                  className={`px-1 py-px border text-[10px] ${
                    set
                      ? 'border-[#00ff41] text-[#00ff41] bg-[#003a10]'
                      : 'border-[#1a3a1a] text-[#4a7a4a]'
                  }`}
                >
                  {f}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[#4a7a4a] text-[10px] tracking-[2px] mb-1 pb-0.5 border-b border-[#1a3a1a]">
            INFO
          </div>
          <div className="flex justify-between items-center py-0.5 px-1 my-px">
            <span className="text-[#4a7a4a] text-[11px] min-w-[28px]">CY</span>
            <span className="text-[#00ff41] text-[12px] text-right">{regs.cycles}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
