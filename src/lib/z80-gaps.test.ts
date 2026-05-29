import { describe, it, expect } from 'vitest';
import { Z80 } from './z80';

function run(bytes: number[], sp = 0x8FFF, maxSteps = 200) {
  const mem = new Uint8Array(65536);
  bytes.forEach((b, i) => { mem[i] = b; });
  const cpu = new Z80(mem);
  cpu.SP = sp;
  let steps = 0;
  while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
  return { cpu, mem };
}

// z80.ts line 265: PUSH DE (0xD5) / POP DE (0xD1)
describe('PUSH/POP DE and HL (lines 265-266)', () => {
  it('PUSH DE saves DE on stack', () => {
    // LD DE,0xABCD; PUSH DE; POP BC; HALT
    const { cpu } = run([0x11,0xCD,0xAB, 0xD5, 0xC1, 0x76]);
    expect(cpu.BC).toBe(0xABCD);
  });

  it('PUSH HL saves HL on stack', () => {
    // LD HL,0x1234; PUSH HL; POP BC; HALT
    const { cpu } = run([0x21,0x34,0x12, 0xE5, 0xC1, 0x76]);
    expect(cpu.BC).toBe(0x1234);
  });

  it('POP HL restores HL from stack', () => {
    // LD BC,0x5678; PUSH BC; POP HL; HALT
    const { cpu } = run([0x01,0x78,0x56, 0xC5, 0xE1, 0x76]);
    expect(cpu.HL).toBe(0x5678);
  });

  it('PUSH AF saves AF on stack', () => {
    // LD A,0x42; PUSH AF; POP BC; HALT
    const { cpu } = run([0x3E,0x42, 0xF5, 0xC1, 0x76]);
    expect(cpu.B).toBe(0x42);
  });

  it('POP AF restores AF from stack', () => {
    // LD BC,0x5500; PUSH BC; POP AF; HALT
    const { cpu } = run([0x01,0x00,0x55, 0xC5, 0xF1, 0x76]);
    expect(cpu.A).toBe(0x55);
  });
});

// z80.ts line 383: LD A,(IY+d)
describe('execFD LD A,(IY+d) (line 383)', () => {
  it('LD A,(IY+d) loads from memory at IY+d', () => {
    const mem = new Uint8Array(65536);
    mem[0x8003] = 0x77;
    // LD IY,0x8000; LD A,(IY+3); HALT
    [0xFD,0x21,0x00,0x80, 0xFD,0x7E,0x03, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x77);
  });
});

// z80.ts line 393: JP (IY) — FD E9
// (already tested in z80-extended but listing again for line 394 default branch)
describe('execFD JP (IY) and default (lines 393-394)', () => {
  it('JP (IY) jumps to IY address', () => {
    const mem = new Uint8Array(65536);
    mem[0x0010] = 0x76; // HALT at 0x0010
    // LD IY,0x0010; JP (IY)
    [0xFD,0x21,0x10,0x00, 0xFD,0xE9].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    let steps = 0;
    while (!cpu.halted && steps < 50) { cpu.step(); steps++; }
    expect(cpu.PC).toBe(0x0011);
  });

  it('unimplemented FD opcode is treated as NOP', () => {
    // FD 0xFF is unimplemented — should not crash
    const { cpu } = run([0xFD, 0xFF, 0x76]);
    expect(cpu.halted).toBe(true);
  });
});

// z80.ts line 461: IN A,(C) in execED — opcode 0x78
describe('execED IN A,(C) (line 461)', () => {
  it('IN A,(C) zeroes A (simplified I/O)', () => {
    // LD A,0xFF; ED 0x78 (IN A,(C)); HALT
    const { cpu } = run([0x3E,0xFF, 0xED,0x78, 0x76]);
    expect(cpu.A).toBe(0);
  });
});

// z80.ts line 462: default break in execED
describe('execED default branch (line 462)', () => {
  it('unimplemented ED opcode treated as NOP', () => {
    // ED 0xFF is unimplemented — should not crash
    const { cpu } = run([0xED, 0xFF, 0x76]);
    expect(cpu.halted).toBe(true);
  });
});
