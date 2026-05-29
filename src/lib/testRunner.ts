import type { Z80 } from './z80';
import { parseNum } from './assembler';

export interface TestResult {
  name: string;
  pass: boolean;
  expected: number;
  actual: number;
  reg?: string;
}

export function runTestSuite(cpu: Z80, testSrc: string): TestResult[] {
  const results: TestResult[] = [];
  const lines = testSrc.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*/, '').replace(/;.*/, '').trim();
    if (!line) continue;

    let m = line.match(/^assert\s+(\w+)\s*==?\s*(.+)$/i);
    if (m) {
      const reg = m[1].toUpperCase();
      const expected = parseNum(m[2].trim()) & 0xFFFF;
      const actual = getRegVal(cpu, reg);
      results.push({ name: `${reg} == ${fmtHex(expected, reg.length <= 2 ? 2 : 4)}`, pass: actual === expected, expected, actual, reg });
      continue;
    }

    m = line.match(/^assert\s+mem\[(.+)\]\s*==?\s*(.+)$/i);
    if (m) {
      const addr = parseNum(m[1].trim()) & 0xFFFF;
      const expected = parseNum(m[2].trim()) & 0xFF;
      const actual = cpu.mem[addr];
      results.push({ name: `mem[${fmtHex(addr, 4)}] == ${fmtHex(expected, 2)}`, pass: actual === expected, expected, actual });
      continue;
    }

    m = line.match(/^assert\s+flag\s+(\w+)\s*==?\s*([01])$/i);
    if (m) {
      const flag = m[1].toUpperCase(), expected = parseInt(m[2]);
      const flagMap: Record<string, number> = { S: cpu.fS, Z: cpu.fZ, H: cpu.fH, PV: cpu.fPV, N: cpu.fN, C: cpu.fC };
      const actual = flagMap[flag] ?? 0;
      results.push({ name: `flag ${flag} == ${expected}`, pass: actual === expected, expected, actual });
    }
  }
  return results;
}

function getRegVal(cpu: Z80, reg: string): number {
  const map: Record<string, () => number> = {
    A: () => cpu.A, B: () => cpu.B, C: () => cpu.C, D: () => cpu.D,
    E: () => cpu.E, H: () => cpu.H, L: () => cpu.L, F: () => cpu.F,
    BC: () => cpu.BC, DE: () => cpu.DE, HL: () => cpu.HL, AF: () => cpu.AF,
    IX: () => cpu.IX, IY: () => cpu.IY, SP: () => cpu.SP, PC: () => cpu.PC,
  };
  return (map[reg] ?? (() => 0))();
}

export function fmtHex(v: number, digits: number): string {
  return '0x' + v.toString(16).toUpperCase().padStart(digits, '0');
}
