import { describe, it, expect } from 'vitest';
import { Z80 } from './z80';

function run(bytes: number[], maxSteps = 200) {
  const mem = new Uint8Array(65536);
  bytes.forEach((b, i) => { mem[i] = b; });
  const cpu = new Z80(mem);
  let steps = 0;
  while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
  return { cpu, mem };
}

function runWithSP(bytes: number[], sp = 0x8FFF, maxSteps = 200) {
  const mem = new Uint8Array(65536);
  bytes.forEach((b, i) => { mem[i] = b; });
  const cpu = new Z80(mem);
  cpu.SP = sp;
  let steps = 0;
  while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
  return { cpu, mem };
}

// ─── ADC A,r with carry ───────────────────────────────────────────────────────

describe('ADC A,r (0x88-0x8F)', () => {
  it('ADC A,B adds B plus carry=1', () => {
    // SCF (set carry), LD A,1, LD B,1, ADC A,B, HALT
    const { cpu } = run([0x37, 0x3E, 0x01, 0x06, 0x01, 0x88, 0x76]);
    expect(cpu.A).toBe(3); // 1 + 1 + carry(1)
  });

  it('ADC A,C adds C plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x05, 0x0E, 0x02, 0x89, 0x76]);
    expect(cpu.A).toBe(8); // 5 + 2 + 1
  });

  it('ADC A,D adds D plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x10, 0x16, 0x10, 0x8A, 0x76]);
    expect(cpu.A).toBe(0x21);
  });

  it('ADC A,E adds E plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x00, 0x1E, 0x00, 0x8B, 0x76]);
    expect(cpu.A).toBe(1); // 0 + 0 + 1
  });

  it('ADC A,H adds H plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x02, 0x26, 0x03, 0x8C, 0x76]);
    expect(cpu.A).toBe(6); // 2 + 3 + 1
  });

  it('ADC A,L adds L plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x02, 0x2E, 0x03, 0x8D, 0x76]);
    expect(cpu.A).toBe(6);
  });

  it('ADC A,A adds A plus A plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x01, 0x8F, 0x76]);
    expect(cpu.A).toBe(3); // 1+1+1
  });

  it('ADC A,n immediate with carry set', () => {
    // SCF; LD A,0x10; ADC A,0x0F; HALT  => 0x10 + 0x0F + 1 = 0x20
    const { cpu } = run([0x37, 0x3E, 0x10, 0xCE, 0x0F, 0x76]);
    expect(cpu.A).toBe(0x20);
  });

  it('ADC A,n without carry', () => {
    // LD A,5; ADC A,3; HALT  => carry=0, so 5+3=8
    const { cpu } = run([0x3E, 0x05, 0xCE, 0x03, 0x76]);
    expect(cpu.A).toBe(8);
  });
});

// ─── SBC A,r with borrow ──────────────────────────────────────────────────────

describe('SBC A,r (0x98-0x9F)', () => {
  it('SBC A,B subtracts B plus borrow=1', () => {
    // SCF; LD A,5; LD B,2; SBC A,B; HALT => 5-2-1=2
    const { cpu } = run([0x37, 0x3E, 0x05, 0x06, 0x02, 0x98, 0x76]);
    expect(cpu.A).toBe(2);
    expect(cpu.fN).toBe(1);
  });

  it('SBC A,C subtracts C plus carry', () => {
    const { cpu } = run([0x37, 0x3E, 0x0A, 0x0E, 0x03, 0x99, 0x76]);
    expect(cpu.A).toBe(6); // 10 - 3 - 1
  });

  it('SBC A,D', () => {
    const { cpu } = run([0x37, 0x3E, 0x0A, 0x16, 0x04, 0x9A, 0x76]);
    expect(cpu.A).toBe(5); // 10 - 4 - 1
  });

  it('SBC A,E', () => {
    const { cpu } = run([0x37, 0x3E, 0x0A, 0x1E, 0x05, 0x9B, 0x76]);
    expect(cpu.A).toBe(4);
  });

  it('SBC A,H', () => {
    const { cpu } = run([0x37, 0x3E, 0x0A, 0x26, 0x05, 0x9C, 0x76]);
    expect(cpu.A).toBe(4);
  });

  it('SBC A,L', () => {
    const { cpu } = run([0x37, 0x3E, 0x0A, 0x2E, 0x05, 0x9D, 0x76]);
    expect(cpu.A).toBe(4);
  });

  it('SBC A,A subtracts A from itself with carry => -1 mod 256', () => {
    // SCF; LD A,5; SBC A,A; HALT => 5-5-1 = -1 = 0xFF
    const { cpu } = run([0x37, 0x3E, 0x05, 0x9F, 0x76]);
    expect(cpu.A).toBe(0xFF);
    expect(cpu.fC).toBe(1); // borrow
  });

  it('SBC A,n immediate with carry', () => {
    // SCF; LD A,0x10; SBC A,0x05; HALT => 0x10 - 0x05 - 1 = 0x0A
    const { cpu } = run([0x37, 0x3E, 0x10, 0xDE, 0x05, 0x76]);
    expect(cpu.A).toBe(0x0A);
  });
});

// ─── Conditional JP cc,nn ─────────────────────────────────────────────────────

describe('JP cc,nn - taken and not taken', () => {
  // JP NZ taken (Z=0)
  it('JP NZ taken when Z=0', () => {
    // XOR A (Z=1), INC A (Z=0 now), JP NZ,0x0008, HALT@5, NOP@8, HALT@9
    //  0: AF     (XOR A)
    //  1: 3C     (INC A)
    //  2: C2 08 00 (JP NZ, 0x0008)
    //  5: 76     (HALT - should not reach)
    //  8: 76     (HALT at target)
    const mem = new Uint8Array(65536);
    [0xAF, 0x3C, 0xC2, 0x08, 0x00, 0x76, 0x00, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(9); // reached halt at 8
  });

  it('JP NZ not taken when Z=1', () => {
    // XOR A (Z=1), JP NZ,0x0008, HALT@5
    const mem = new Uint8Array(65536);
    [0xAF, 0xC2, 0x08, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(5); // did NOT jump
  });

  it('JP Z taken when Z=1', () => {
    // XOR A (Z=1), JP Z,0x0006, HALT@3(skip), NOP, NOP, HALT@6
    const mem = new Uint8Array(65536);
    [0xAF, 0xCA, 0x06, 0x00, 0x76, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(7);
  });

  it('JP Z not taken when Z=0', () => {
    // LD A,1 (Z=0), JP Z,0x0008, HALT@3
    const mem = new Uint8Array(65536);
    [0x3E, 0x01, 0xCA, 0x08, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });

  it('JP NC taken when C=0', () => {
    // XOR A (C=0), JP NC,0x0006, HALT@3, NOP, NOP, HALT@6
    const mem = new Uint8Array(65536);
    [0xAF, 0xD2, 0x06, 0x00, 0x76, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(7);
  });

  it('JP NC not taken when C=1', () => {
    // SCF (C=1), JP NC,0x0008, HALT@2
    const mem = new Uint8Array(65536);
    [0x37, 0xD2, 0x08, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(5);
  });

  it('JP C taken when C=1', () => {
    // SCF (C=1), JP C,0x0006, HALT@2, NOP, NOP, HALT@6
    const mem = new Uint8Array(65536);
    [0x37, 0xDA, 0x06, 0x00, 0x76, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(7);
  });

  it('JP C not taken when C=0', () => {
    // XOR A (C=0), JP C,0x0008, HALT@2
    const mem = new Uint8Array(65536);
    [0xAF, 0xDA, 0x08, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(5);
  });

  it('JP PO taken when PV=0', () => {
    // XOR A (PV=parity(0)=1 actually... use LD A,1 which has PV=0 after XOR)
    // LD A,1 -> no PV effect; after SUB that sets PV=0 would work
    // Simplest: XOR A sets PV=parity(0)=1; LD A,1 then CP 1 => Z=1 PV=0
    // Actually: just force F directly - we can use setF via CPU: let's use
    // LD A,0x01 + AND 0x01 => A=1, PV=parity(1)=0 (odd parity)
    // 0: 3E 01 (LD A,1)
    // 2: E6 01 (AND 1) => PV=parity(1)=0
    // 4: E2 08 00 (JP PO, 0x0008)
    // 7: 76 (HALT skip)
    // 8: 76 (HALT target)
    const mem = new Uint8Array(65536);
    [0x3E, 0x01, 0xE6, 0x01, 0xE2, 0x08, 0x00, 0x76, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(9);
  });

  it('JP PE taken when PV=1', () => {
    // XOR A => A=0, PV=parity(0)=1
    // 0: AF (XOR A => A=0 PV=1)
    // 1: EA 05 00 (JP PE, 0x0005)
    // 4: 76 (skip HALT)
    // 5: 76 (target HALT)
    const mem = new Uint8Array(65536);
    [0xAF, 0xEA, 0x05, 0x00, 0x76, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });

  it('JP P taken when S=0', () => {
    // LD A,1 (positive), JP P,0x0006
    // Actually after LD A,n, flags are not set. Use ADD A,0 or AND A
    // 0: 3E 01 (LD A,1)
    // 2: A7    (AND A => S set from A=1 => S=0, positive)
    // 3: F2 07 00 (JP P, 0x0007)
    // 6: 76 (skip)
    // 7: 76 (target)
    const mem = new Uint8Array(65536);
    [0x3E, 0x01, 0xA7, 0xF2, 0x07, 0x00, 0x76, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(8);
  });

  it('JP M taken when S=1', () => {
    // LD A,0x80 (negative), AND A => S=1
    // 0: 3E 80
    // 2: A7 (AND A)
    // 3: FA 07 00 (JP M, 0x0007)
    // 6: 76
    // 7: 76
    const mem = new Uint8Array(65536);
    [0x3E, 0x80, 0xA7, 0xFA, 0x07, 0x00, 0x76, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(8);
  });
});

// ─── JP (HL) ──────────────────────────────────────────────────────────────────

describe('JP (HL)', () => {
  it('jumps to address in HL', () => {
    // LD HL,0x0005; JP (HL); NOP; NOP; HALT@5
    const mem = new Uint8Array(65536);
    [0x21, 0x05, 0x00, 0xE9, 0x76, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });
});

// ─── Conditional CALL ────────────────────────────────────────────────────────

describe('conditional CALL', () => {
  it('CALL NZ taken', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // LD A,1 (Z=0 after AND), AND A, CALL NZ,0x000B, HALT@6, sub: INC B; RET
    // 0: 3E 01   LD A,1
    // 2: A7      AND A  (Z=0, S=0)
    // 3: C4 0B 00  CALL NZ,0x000B
    // 6: 76      HALT
    // 11: 04     INC B
    // 12: C9     RET
    [0x3E, 0x01, 0xA7, 0xC4, 0x0B, 0x00, 0x76, 0x00, 0x00, 0x00, 0x00, 0x04, 0xC9]
      .forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(1); // subroutine ran
  });

  it('CALL NZ not taken when Z=1', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // XOR A (Z=1), CALL NZ,0x0008, HALT@2
    [0xAF, 0xC4, 0x08, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0); // never ran sub
  });

  it('CALL Z taken when Z=1', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // XOR A (Z=1), CALL Z,0x0006, HALT@4, sub: INC B; RET
    [0xAF, 0xCC, 0x06, 0x00, 0x76, 0x00, 0x04, 0xC9].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(1);
  });

  it('CALL NC taken when C=0', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // XOR A (C=0), CALL NC,0x0006, HALT@4, sub: INC B; RET
    [0xAF, 0xD4, 0x06, 0x00, 0x76, 0x00, 0x04, 0xC9].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(1);
  });

  it('CALL C taken when C=1', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // SCF, CALL C,0x0006, HALT, HALT, sub: INC B; RET
    [0x37, 0xDC, 0x06, 0x00, 0x76, 0x00, 0x04, 0xC9].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(1);
  });

  // Note: CALL PO (0xE4), CALL PE (0xEC), CALL P (0xF4), CALL M (0xFC)
  // are NOT implemented in this emulator (default: break). They act as NOPs.
  it('CALL PO (0xE4) is not implemented, acts as NOP - consumes no extra bytes', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // 0: E4 09 00 (CALL PO, 0x0009 - opcode not implemented, NOP-like)
    // 3: 76 (HALT)
    [0xE4, 0x09, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    cpu.step(); // execute 0xE4 - treated as NOP (default case)
    // After executing 0xE4 as NOP, PC=1 (only consumed 1 byte)
    // Then 0x09 is ADD HL,BC...but we just check it doesn't crash
    expect(cpu.halted).toBe(false);
    expect(cpu.B).toBe(0); // no subroutine ran
  });

  it('CALL PE (0xEC) is not implemented, acts as NOP', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    [0xEC, 0x09, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    cpu.step(); // 0xEC: default NOP
    expect(cpu.halted).toBe(false);
  });

  it('CALL P (0xF4) is not implemented, acts as NOP', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    [0xF4, 0x09, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    cpu.step();
    expect(cpu.halted).toBe(false);
  });

  it('CALL M (0xFC) is not implemented, acts as NOP', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    [0xFC, 0x09, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    cpu.step();
    expect(cpu.halted).toBe(false);
  });
});

// ─── Conditional RET ─────────────────────────────────────────────────────────

describe('conditional RET', () => {
  function makeRetTest(retOp: number, flagSetup: number[], expectReturn: boolean) {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // CALL sub, HALT@3, sub: flagSetup..., retOp, LD B,0xAA, RET
    const sub = 6 + flagSetup.length;
    // 0: CD sub_lo sub_hi CALL sub
    // 3: 76 HALT
    // sub: flagSetup; retOp; LD B 0xAA; C9
    mem[0] = 0xCD; mem[1] = sub & 0xFF; mem[2] = (sub >> 8) & 0xFF;
    mem[3] = 0x76;
    flagSetup.forEach((b, i) => { mem[sub + i] = b; });
    const after = sub + flagSetup.length;
    mem[after] = retOp;
    mem[after + 1] = 0x06; mem[after + 2] = 0xAA; // LD B,0xAA (if not returned)
    mem[after + 3] = 0xC9; // RET
    while (!cpu.halted) cpu.step();
    return { cpu, returned: cpu.B !== 0xAA };
  }

  it('RET NZ returns when Z=0', () => {
    // In sub: LD A,1; AND A => Z=0; RET NZ
    const { cpu, returned } = makeRetTest(0xC0, [0x3E, 0x01, 0xA7], true);
    expect(returned).toBe(true);
  });

  it('RET NZ does not return when Z=1', () => {
    // In sub: XOR A => Z=1; RET NZ (not taken)
    const { returned } = makeRetTest(0xC0, [0xAF], false);
    expect(returned).toBe(false);
  });

  it('RET Z returns when Z=1', () => {
    const { returned } = makeRetTest(0xC8, [0xAF], true);
    expect(returned).toBe(true);
  });

  it('RET Z does not return when Z=0', () => {
    const { returned } = makeRetTest(0xC8, [0x3E, 0x01, 0xA7], false);
    expect(returned).toBe(false);
  });

  it('RET NC returns when C=0', () => {
    const { returned } = makeRetTest(0xD0, [0xAF], true); // XOR A clears C
    expect(returned).toBe(true);
  });

  it('RET NC does not return when C=1', () => {
    const { returned } = makeRetTest(0xD0, [0x37], false); // SCF sets C
    expect(returned).toBe(false);
  });

  it('RET C returns when C=1', () => {
    const { returned } = makeRetTest(0xD8, [0x37], true);
    expect(returned).toBe(true);
  });

  it('RET C does not return when C=0', () => {
    const { returned } = makeRetTest(0xD8, [0xAF], false);
    expect(returned).toBe(false);
  });

  it('RET PO returns when PV=0', () => {
    // AND 1 on A=1 => parity(1)=0
    const { returned } = makeRetTest(0xE0, [0x3E, 0x01, 0xE6, 0x01], true);
    expect(returned).toBe(true);
  });

  it('RET PE returns when PV=1', () => {
    // XOR A => parity(0)=1
    const { returned } = makeRetTest(0xE8, [0xAF], true);
    expect(returned).toBe(true);
  });

  it('RET P returns when S=0', () => {
    // AND A with A=1 => S=0
    const { returned } = makeRetTest(0xF0, [0x3E, 0x01, 0xA7], true);
    expect(returned).toBe(true);
  });

  it('RET M returns when S=1', () => {
    // AND A with A=0x80 => S=1
    const { returned } = makeRetTest(0xF8, [0x3E, 0x80, 0xA7], true);
    expect(returned).toBe(true);
  });
});

// ─── RST ─────────────────────────────────────────────────────────────────────

describe('RST', () => {
  it('RST 0x00 pushes PC and jumps to 0x0000', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // 0x0000: HALT (RST destination)
    // 0x0010: RST 0x00
    mem[0x0000] = 0x76; // HALT at RST vector
    mem[0x0010] = 0xC7; // RST 0x00
    cpu.PC = 0x0010;
    cpu.step(); // RST 0x00
    expect(cpu.PC).toBe(0x0000);
  });

  it('RST 0x08 jumps to 0x0008', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0008] = 0x76;
    mem[0x0020] = 0xCF; // RST 0x08
    cpu.PC = 0x0020;
    cpu.step();
    expect(cpu.PC).toBe(0x0008);
  });

  it('RST 0x10 jumps to 0x0010', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0010] = 0x76;
    mem[0x0030] = 0xD7; // RST 0x10
    cpu.PC = 0x0030;
    cpu.step();
    expect(cpu.PC).toBe(0x0010);
  });

  it('RST 0x18 jumps to 0x0018', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0018] = 0x76;
    mem[0x0040] = 0xDF; // RST 0x18
    cpu.PC = 0x0040;
    cpu.step();
    expect(cpu.PC).toBe(0x0018);
  });

  it('RST 0x20 jumps to 0x0020', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0020] = 0x76;
    mem[0x0050] = 0xE7; // RST 0x20
    cpu.PC = 0x0050;
    cpu.step();
    expect(cpu.PC).toBe(0x0020);
  });

  it('RST 0x28 jumps to 0x0028', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0028] = 0x76;
    mem[0x0060] = 0xEF; // RST 0x28
    cpu.PC = 0x0060;
    cpu.step();
    expect(cpu.PC).toBe(0x0028);
  });

  it('RST 0x30 jumps to 0x0030', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0030] = 0x76;
    mem[0x0070] = 0xF7; // RST 0x30
    cpu.PC = 0x0070;
    cpu.step();
    expect(cpu.PC).toBe(0x0030);
  });

  it('RST 0x38 jumps to 0x0038', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    mem[0x0038] = 0x76;
    mem[0x0080] = 0xFF; // RST 0x38
    cpu.PC = 0x0080;
    cpu.step();
    expect(cpu.PC).toBe(0x0038);
  });
});

// ─── EX AF,AF' / EXX / EX (SP),HL ───────────────────────────────────────────

describe('EX AF,AF\' (0x08)', () => {
  it('swaps AF with AF\'', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0x42; cpu.F = 0x55;
    cpu.A2 = 0xAA; cpu.F2 = 0xBB;
    mem[0] = 0x08; mem[1] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0xAA);
    expect(cpu.F).toBe(0xBB);
    expect(cpu.A2).toBe(0x42);
    expect(cpu.F2).toBe(0x55);
  });
});

describe('EXX (0xD9)', () => {
  it('swaps BC,DE,HL with alternates', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.BC = 0x1234; cpu.DE = 0x5678; cpu.HL = 0x9ABC;
    cpu.B2 = 0xAA; cpu.C2 = 0xBB;
    cpu.D2 = 0xCC; cpu.E2 = 0xDD;
    cpu.H2 = 0xEE; cpu.L2 = 0xFF;
    mem[0] = 0xD9; mem[1] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.BC).toBe(0xAABB);
    expect(cpu.DE).toBe(0xCCDD);
    expect(cpu.HL).toBe(0xEEFF);
    expect(cpu.B2).toBe(0x12); expect(cpu.C2).toBe(0x34);
  });
});

describe('EX (SP),HL (0xE3)', () => {
  it('exchanges HL with top of stack', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8000;
    cpu.HL = 0x1234;
    mem[0x8000] = 0x78; mem[0x8001] = 0x56; // stack holds 0x5678
    mem[0] = 0xE3; mem[1] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.HL).toBe(0x5678);
    expect(mem[0x8000]).toBe(0x34); // low byte of old HL
    expect(mem[0x8001]).toBe(0x12); // high byte of old HL
  });
});

// ─── RLCA / RRCA / RLA / RRA ──────────────────────────────────────────────────

describe('RLCA (0x07)', () => {
  it('rotates A left, MSB to carry and bit 0', () => {
    // LD A,0x80; RLCA; HALT => A=0x01, C=1
    const { cpu } = run([0x3E, 0x80, 0x07, 0x76]);
    expect(cpu.A).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('rotates 0x01 left to 0x02', () => {
    const { cpu } = run([0x3E, 0x01, 0x07, 0x76]);
    expect(cpu.A).toBe(0x02);
    expect(cpu.fC).toBe(0);
  });
});

describe('RRCA (0x0F)', () => {
  it('rotates A right, LSB to carry and bit 7', () => {
    const { cpu } = run([0x3E, 0x01, 0x0F, 0x76]);
    expect(cpu.A).toBe(0x80);
    expect(cpu.fC).toBe(1);
  });

  it('rotates 0x80 right to 0x40', () => {
    const { cpu } = run([0x3E, 0x80, 0x0F, 0x76]);
    expect(cpu.A).toBe(0x40);
    expect(cpu.fC).toBe(0);
  });
});

describe('RLA (0x17)', () => {
  it('rotates A left through carry', () => {
    // SCF; LD A,0x40; RLA; HALT => A=0x81 (0x40<<1 | carry=1), new carry = 0
    const { cpu } = run([0x37, 0x3E, 0x40, 0x17, 0x76]);
    expect(cpu.A).toBe(0x81);
    expect(cpu.fC).toBe(0);
  });

  it('old MSB goes to carry', () => {
    // LD A,0x80; RLA => A=0x00, C=1 (carry was 0)
    const { cpu } = run([0x3E, 0x80, 0x17, 0x76]);
    expect(cpu.A).toBe(0x00);
    expect(cpu.fC).toBe(1);
  });
});

describe('RRA (0x1F)', () => {
  it('rotates A right through carry', () => {
    // SCF; LD A,0x02; RRA; HALT => A=0x81 (0x02>>1 | carry<<7=0x80), new C=0
    const { cpu } = run([0x37, 0x3E, 0x02, 0x1F, 0x76]);
    expect(cpu.A).toBe(0x81);
    expect(cpu.fC).toBe(0);
  });

  it('old LSB goes to carry', () => {
    const { cpu } = run([0x3E, 0x01, 0x1F, 0x76]);
    expect(cpu.A).toBe(0x00);
    expect(cpu.fC).toBe(1);
  });
});

// ─── DAA ─────────────────────────────────────────────────────────────────────

describe('DAA (0x27)', () => {
  it('corrects BCD after ADD', () => {
    // LD A,0x09; ADD A,0x01 => A=0x0A; DAA => A=0x10 (BCD 09+01=10)
    const { cpu } = run([0x3E, 0x09, 0xC6, 0x01, 0x27, 0x76]);
    expect(cpu.A).toBe(0x10);
  });

  it('corrects BCD after SUB (N flag set)', () => {
    // LD A,0x10; SUB 0x01 => A=0x0F, N=1; DAA => A=0x09 (BCD 10-01=09)
    const { cpu } = run([0x3E, 0x10, 0xD6, 0x01, 0x27, 0x76]);
    expect(cpu.A).toBe(0x09);
  });

  it('DAA sets zero flag when result is 0', () => {
    // LD A,0x00; DAA; HALT => still 0
    const { cpu } = run([0x3E, 0x00, 0x27, 0x76]);
    expect(cpu.fZ).toBe(1);
  });
});

// ─── CPL / CCF / SCF ─────────────────────────────────────────────────────────

describe('CPL (0x2F)', () => {
  it('complements A', () => {
    const { cpu } = run([0x3E, 0x55, 0x2F, 0x76]);
    expect(cpu.A).toBe(0xAA);
    expect(cpu.fN).toBe(1);
    expect(cpu.fH).toBe(1);
  });
});

describe('CCF (0x3F)', () => {
  it('complements carry flag', () => {
    // SCF; CCF => C=0
    const { cpu } = run([0x37, 0x3F, 0x76]);
    expect(cpu.fC).toBe(0);
  });

  it('CCF with C=0 sets C=1', () => {
    const { cpu } = run([0xAF, 0x3F, 0x76]);
    expect(cpu.fC).toBe(1);
  });
});

describe('SCF (0x37)', () => {
  it('sets carry flag', () => {
    const { cpu } = run([0xAF, 0x37, 0x76]);
    expect(cpu.fC).toBe(1);
    expect(cpu.fN).toBe(0);
  });
});

// ─── LD A,(BC) / LD A,(DE) / LD (BC),A / LD (DE),A ──────────────────────────

describe('LD A,(BC) / LD A,(DE) / LD (BC),A / LD (DE),A', () => {
  it('LD A,(BC) reads from memory at BC', () => {
    const mem = new Uint8Array(65536);
    mem[0x1234] = 0x77;
    [0x01, 0x34, 0x12, 0x0A, 0x76].forEach((b, i) => { mem[i] = b; }); // LD BC,0x1234; LD A,(BC)
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x77);
  });

  it('LD A,(DE) reads from memory at DE', () => {
    const mem = new Uint8Array(65536);
    mem[0x2000] = 0xAB;
    [0x11, 0x00, 0x20, 0x1A, 0x76].forEach((b, i) => { mem[i] = b; }); // LD DE,0x2000; LD A,(DE)
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0xAB);
  });

  it('LD (BC),A stores A at BC', () => {
    const mem = new Uint8Array(65536);
    [0x01, 0x00, 0x30, 0x3E, 0x55, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x3000]).toBe(0x55);
  });

  it('LD (DE),A stores A at DE', () => {
    const mem = new Uint8Array(65536);
    [0x11, 0x00, 0x40, 0x3E, 0x99, 0x12, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x4000]).toBe(0x99);
  });
});

// ─── LD SP,HL / LD (HL),n ────────────────────────────────────────────────────

describe('LD SP,HL (0xF9)', () => {
  it('loads HL into SP', () => {
    const { cpu } = run([0x21, 0x00, 0x50, 0xF9, 0x76]);
    expect(cpu.SP).toBe(0x5000);
  });
});

describe('LD (HL),n (0x36)', () => {
  it('stores immediate byte at (HL)', () => {
    const mem = new Uint8Array(65536);
    [0x21, 0x00, 0x80, 0x36, 0xAB, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0xAB);
  });
});

// ─── INC (HL) / DEC (HL) ─────────────────────────────────────────────────────

describe('INC (HL) / DEC (HL)', () => {
  it('INC (HL) increments memory at HL', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x09;
    [0x21, 0x00, 0x80, 0x34, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x0A);
  });

  it('DEC (HL) decrements memory at HL', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x05;
    [0x21, 0x00, 0x80, 0x35, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x04);
  });
});

// ─── ADD HL,rr ────────────────────────────────────────────────────────────────

describe('ADD HL,rr', () => {
  it('ADD HL,DE', () => {
    const { cpu } = run([0x21, 0x00, 0x10, 0x11, 0x00, 0x10, 0x19, 0x76]);
    expect(cpu.HL).toBe(0x2000);
  });

  it('ADD HL,HL', () => {
    const { cpu } = run([0x21, 0x01, 0x00, 0x29, 0x76]);
    expect(cpu.HL).toBe(0x0002);
  });

  it('ADD HL,SP', () => {
    const mem = new Uint8Array(65536);
    [0x21, 0x00, 0x10, 0x31, 0x00, 0x10, 0x39, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.HL).toBe(0x2000);
  });
});

// ─── execCB - full rotation/shift coverage ────────────────────────────────────

describe('execCB rotations on all registers', () => {
  // RLC on each register
  const regLoads: Array<[number, number, string]> = [
    [0x06, 0x80, 'B'], // LD B,0x80; RLC B (0xCB 0x00)
    [0x0E, 0x80, 'C'], // LD C,0x80; RLC C (0xCB 0x01)
    [0x16, 0x80, 'D'], // LD D,0x80; RLC D (0xCB 0x02)
    [0x1E, 0x80, 'E'], // LD E,0x80; RLC E (0xCB 0x03)
    [0x26, 0x80, 'H'], // LD H,0x80; RLC H (0xCB 0x04)
    [0x2E, 0x80, 'L'], // LD L,0x80; RLC L (0xCB 0x05)
  ];

  it('RLC B', () => {
    const { cpu } = run([0x06, 0x80, 0xCB, 0x00, 0x76]);
    expect(cpu.B).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC C', () => {
    const { cpu } = run([0x0E, 0x80, 0xCB, 0x01, 0x76]);
    expect(cpu.C).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC D', () => {
    const { cpu } = run([0x16, 0x80, 0xCB, 0x02, 0x76]);
    expect(cpu.D).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC E', () => {
    const { cpu } = run([0x1E, 0x80, 0xCB, 0x03, 0x76]);
    expect(cpu.E).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC H', () => {
    const { cpu } = run([0x26, 0x80, 0xCB, 0x04, 0x76]);
    expect(cpu.H).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC L', () => {
    const { cpu } = run([0x2E, 0x80, 0xCB, 0x05, 0x76]);
    expect(cpu.L).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RLC (HL)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x80;
    [0x21, 0x00, 0x80, 0xCB, 0x06, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('RRC B', () => {
    const { cpu } = run([0x06, 0x01, 0xCB, 0x08, 0x76]);
    expect(cpu.B).toBe(0x80);
    expect(cpu.fC).toBe(1);
  });

  it('RRC C', () => {
    const { cpu } = run([0x0E, 0x01, 0xCB, 0x09, 0x76]);
    expect(cpu.C).toBe(0x80);
  });

  it('RRC D', () => {
    const { cpu } = run([0x16, 0x01, 0xCB, 0x0A, 0x76]);
    expect(cpu.D).toBe(0x80);
  });

  it('RRC E', () => {
    const { cpu } = run([0x1E, 0x01, 0xCB, 0x0B, 0x76]);
    expect(cpu.E).toBe(0x80);
  });

  it('RRC H', () => {
    const { cpu } = run([0x26, 0x01, 0xCB, 0x0C, 0x76]);
    expect(cpu.H).toBe(0x80);
  });

  it('RRC L', () => {
    const { cpu } = run([0x2E, 0x01, 0xCB, 0x0D, 0x76]);
    expect(cpu.L).toBe(0x80);
  });

  it('RRC (HL)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x01;
    [0x21, 0x00, 0x80, 0xCB, 0x0E, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x80);
    expect(cpu.fC).toBe(1);
  });

  it('RL B (through carry)', () => {
    // SCF; LD B,0x40; RL B => 0x81 (0x40<<1 | carry=1)
    const { cpu } = run([0x37, 0x06, 0x40, 0xCB, 0x10, 0x76]);
    expect(cpu.B).toBe(0x81);
    expect(cpu.fC).toBe(0);
  });

  it('RR C (through carry)', () => {
    // SCF; LD C,0x02; RR C => 0x81
    const { cpu } = run([0x37, 0x0E, 0x02, 0xCB, 0x19, 0x76]);
    expect(cpu.C).toBe(0x81);
    expect(cpu.fC).toBe(0);
  });

  it('SLA D', () => {
    const { cpu } = run([0x16, 0x40, 0xCB, 0x22, 0x76]);
    expect(cpu.D).toBe(0x80);
    expect(cpu.fC).toBe(0);
  });

  it('SRA E (preserves MSB)', () => {
    const { cpu } = run([0x1E, 0x80, 0xCB, 0x2B, 0x76]);
    expect(cpu.E).toBe(0xC0); // 0x80 >> 1 with MSB preserved
  });

  it('SRL H (logical shift right)', () => {
    const { cpu } = run([0x26, 0x80, 0xCB, 0x3C, 0x76]);
    expect(cpu.H).toBe(0x40);
    expect(cpu.fC).toBe(0);
  });

  it('SRL L', () => {
    const { cpu } = run([0x2E, 0x01, 0xCB, 0x3D, 0x76]);
    expect(cpu.L).toBe(0x00);
    expect(cpu.fC).toBe(1);
  });

  // CB bit 6 (SLL - undocumented: shifts left and sets bit 0)
  it('SLL B (undoc, CB 0x30)', () => {
    const { cpu } = run([0x06, 0x40, 0xCB, 0x30, 0x76]);
    expect(cpu.B).toBe(0x81); // 0x40<<1 | 1
    expect(cpu.fC).toBe(0);
  });

  it('SLL (HL) (undoc, CB 0x36)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x40;
    [0x21, 0x00, 0x80, 0xCB, 0x36, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x81);
  });
});

describe('execCB BIT with set bit (Z=0) and unset bit (Z=1)', () => {
  it('BIT 7,A when bit 7 is set => Z=0', () => {
    const { cpu } = run([0x3E, 0x80, 0xCB, 0x7F, 0x76]); // BIT 7,A
    expect(cpu.fZ).toBe(0);
  });

  it('BIT 7,A when bit 7 is not set => Z=1', () => {
    const { cpu } = run([0x3E, 0x00, 0xCB, 0x7F, 0x76]);
    expect(cpu.fZ).toBe(1);
  });

  it('BIT 3,B when bit 3 set => Z=0', () => {
    const { cpu } = run([0x06, 0x08, 0xCB, 0x58, 0x76]); // BIT 3,B
    expect(cpu.fZ).toBe(0);
  });

  it('BIT 0,B when bit 0 unset => Z=1', () => {
    const { cpu } = run([0x06, 0x00, 0xCB, 0x40, 0x76]); // BIT 0,B
    expect(cpu.fZ).toBe(1);
  });

  it('BIT 4,(HL) with bit set', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x10; // bit 4 set
    [0x21, 0x00, 0x80, 0xCB, 0x66, 0x76].forEach((b, i) => { mem[i] = b; }); // BIT 4,(HL)
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.fZ).toBe(0);
  });
});

describe('execCB RES and SET on various regs', () => {
  it('SET 1,B', () => {
    const { cpu } = run([0x06, 0x00, 0xCB, 0xC8, 0x76]); // SET 1,B
    expect(cpu.B).toBe(0x02);
  });

  it('SET 7,C', () => {
    const { cpu } = run([0x0E, 0x00, 0xCB, 0xF9, 0x76]); // SET 7,C
    expect(cpu.C).toBe(0x80);
  });

  it('RES 1,B', () => {
    const { cpu } = run([0x06, 0xFF, 0xCB, 0x88, 0x76]); // RES 1,B
    expect(cpu.B).toBe(0xFD);
  });

  it('RES 7,C', () => {
    const { cpu } = run([0x0E, 0xFF, 0xCB, 0xB9, 0x76]); // RES 7,C
    expect(cpu.C).toBe(0x7F);
  });

  it('SET 3,(HL)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x00;
    [0x21, 0x00, 0x80, 0xCB, 0xDE, 0x76].forEach((b, i) => { mem[i] = b; }); // SET 3,(HL)
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x08);
  });

  it('RES 3,(HL)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0xFF;
    [0x21, 0x00, 0x80, 0xCB, 0x9E, 0x76].forEach((b, i) => { mem[i] = b; }); // RES 3,(HL)
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0xF7);
  });
});

// ─── execDD (IX prefix) ───────────────────────────────────────────────────────

describe('execDD (IX)', () => {
  it('LD IX,nn', () => {
    const { cpu } = run([0xDD, 0x21, 0x34, 0x12, 0x76]);
    expect(cpu.IX).toBe(0x1234);
  });

  it('LD (nn),IX stores IX', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x34, 0x12, 0xDD, 0x22, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x34);
    expect(mem[0x8001]).toBe(0x12);
  });

  it('LD IX,(nn) reads IX from memory', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0xCD; mem[0x8001] = 0xAB;
    [0xDD, 0x2A, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.IX).toBe(0xABCD);
  });

  it('LD (IX+d),n stores immediate byte', () => {
    const mem = new Uint8Array(65536);
    // LD IX,0x8000; LD (IX+2),0x42; HALT
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x36, 0x02, 0x42, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8002]).toBe(0x42);
  });

  it('LD B,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8003] = 0x55;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x46, 0x03, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0x55);
  });

  it('LD C,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8001] = 0x66;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x4E, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.C).toBe(0x66);
  });

  it('LD D,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x77;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x56, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.D).toBe(0x77);
  });

  it('LD E,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8004] = 0x88;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x5E, 0x04, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.E).toBe(0x88);
  });

  it('LD H,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x99;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x66, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.H).toBe(0x99);
  });

  it('LD L,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8001] = 0xAA;
    [0xDD, 0x21, 0x00, 0x80, 0xDD, 0x6E, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.L).toBe(0xAA);
  });

  it('LD (IX+d),B', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x06, 0x42, 0xDD, 0x70, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8001]).toBe(0x42);
  });

  it('LD (IX+d),C', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x0E, 0x43, 0xDD, 0x71, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8002]).toBe(0x43);
  });

  it('LD (IX+d),D', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x16, 0x44, 0xDD, 0x72, 0x03, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8003]).toBe(0x44);
  });

  it('LD (IX+d),E', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x1E, 0x45, 0xDD, 0x73, 0x04, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8004]).toBe(0x45);
  });

  it('LD (IX+d),H', () => {
    const mem = new Uint8Array(65536);
    // LD IX,0x8000; LD H,0x46; LD (IX+5),H
    [0xDD, 0x21, 0x00, 0x80, 0x26, 0x46, 0xDD, 0x74, 0x05, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8005]).toBe(0x46);
  });

  it('LD (IX+d),L', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x2E, 0x47, 0xDD, 0x75, 0x06, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8006]).toBe(0x47);
  });

  it('LD (IX+d),A', () => {
    const mem = new Uint8Array(65536);
    [0xDD, 0x21, 0x00, 0x80, 0x3E, 0xAB, 0xDD, 0x77, 0x07, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8007]).toBe(0xAB);
  });

  it('ADD A,(IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x05;
    [0xDD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xDD, 0x86, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x0F);
  });

  it('SUB (IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x03;
    [0xDD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xDD, 0x96, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x07);
  });

  it('CP (IX+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x0A;
    [0xDD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xDD, 0xBE, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.fZ).toBe(1);
  });

  it('INC IX', () => {
    const { cpu } = run([0xDD, 0x21, 0xFF, 0x00, 0xDD, 0x23, 0x76]);
    expect(cpu.IX).toBe(0x0100);
  });

  it('DEC IX', () => {
    const { cpu } = run([0xDD, 0x21, 0x01, 0x00, 0xDD, 0x2B, 0x76]);
    expect(cpu.IX).toBe(0x0000);
  });

  it('PUSH IX / POP IX round-trips', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    // LD IX,0x1234; PUSH IX; POP IX; HALT
    [0xDD, 0x21, 0x34, 0x12, 0xDD, 0xE5, 0xDD, 0xE1, 0x76].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.IX).toBe(0x1234);
    expect(cpu.SP).toBe(0x8FFF);
  });

  it('JP (IX) jumps to IX', () => {
    const mem = new Uint8Array(65536);
    mem[0x0010] = 0x76;
    [0xDD, 0x21, 0x10, 0x00, 0xDD, 0xE9].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(0x0011);
  });

  it('LD SP,IX', () => {
    const { cpu } = run([0xDD, 0x21, 0x00, 0x50, 0xDD, 0xF9, 0x76]);
    expect(cpu.SP).toBe(0x5000);
  });

  it('LD A,(IX+d) with negative displacement', () => {
    const mem = new Uint8Array(65536);
    // IX=0x8002; LD A,(IX-2) => addr 0x8000
    mem[0x8000] = 0xCC;
    // LD IX,0x8002; LD A,(IX+0xFE) => sb(0xFE)=-2
    [0xDD, 0x21, 0x02, 0x80, 0xDD, 0x7E, 0xFE, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0xCC);
  });
});

// ─── execFD (IY prefix) ───────────────────────────────────────────────────────

describe('execFD (IY)', () => {
  it('LD IY,nn', () => {
    const { cpu } = run([0xFD, 0x21, 0x34, 0x12, 0x76]);
    expect(cpu.IY).toBe(0x1234);
  });

  it('LD (nn),IY stores IY', () => {
    const mem = new Uint8Array(65536);
    [0xFD, 0x21, 0x34, 0x12, 0xFD, 0x22, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x34);
    expect(mem[0x8001]).toBe(0x12);
  });

  it('LD IY,(nn)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0xCD; mem[0x8001] = 0xAB;
    [0xFD, 0x2A, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.IY).toBe(0xABCD);
  });

  it('LD (IY+d),n', () => {
    const mem = new Uint8Array(65536);
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x36, 0x02, 0x99, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8002]).toBe(0x99);
  });

  it('LD B,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8003] = 0x55;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x46, 0x03, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0x55);
  });

  it('LD C,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8001] = 0x66;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x4E, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.C).toBe(0x66);
  });

  it('LD D,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x77;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x56, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.D).toBe(0x77);
  });

  it('LD E,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8004] = 0x88;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x5E, 0x04, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.E).toBe(0x88);
  });

  it('LD H,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x99;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x66, 0x00, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.H).toBe(0x99);
  });

  it('LD L,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8001] = 0xAA;
    [0xFD, 0x21, 0x00, 0x80, 0xFD, 0x6E, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.L).toBe(0xAA);
  });

  it('LD (IY+d),B', () => {
    const mem = new Uint8Array(65536);
    [0xFD, 0x21, 0x00, 0x80, 0x06, 0x42, 0xFD, 0x70, 0x01, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8001]).toBe(0x42);
  });

  it('LD (IY+d),A', () => {
    const mem = new Uint8Array(65536);
    [0xFD, 0x21, 0x00, 0x80, 0x3E, 0xAB, 0xFD, 0x77, 0x07, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8007]).toBe(0xAB);
  });

  it('ADD A,(IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x05;
    [0xFD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xFD, 0x86, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x0F);
  });

  it('SUB (IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x03;
    [0xFD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xFD, 0x96, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x07);
  });

  it('CP (IY+d)', () => {
    const mem = new Uint8Array(65536);
    mem[0x8002] = 0x0A;
    [0xFD, 0x21, 0x00, 0x80, 0x3E, 0x0A, 0xFD, 0xBE, 0x02, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.fZ).toBe(1);
  });

  it('INC IY', () => {
    const { cpu } = run([0xFD, 0x21, 0xFF, 0x00, 0xFD, 0x23, 0x76]);
    expect(cpu.IY).toBe(0x0100);
  });

  it('DEC IY', () => {
    const { cpu } = run([0xFD, 0x21, 0x01, 0x00, 0xFD, 0x2B, 0x76]);
    expect(cpu.IY).toBe(0x0000);
  });

  it('PUSH IY / POP IY round-trips', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFF;
    [0xFD, 0x21, 0x34, 0x12, 0xFD, 0xE5, 0xFD, 0xE1, 0x76].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.IY).toBe(0x1234);
    expect(cpu.SP).toBe(0x8FFF);
  });

  it('JP (IY) jumps to IY', () => {
    const mem = new Uint8Array(65536);
    mem[0x0010] = 0x76;
    [0xFD, 0x21, 0x10, 0x00, 0xFD, 0xE9].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(0x0011);
  });
});

// ─── execED ───────────────────────────────────────────────────────────────────

describe('execED', () => {
  it('LD A,I loads I into A', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.I = 0x42;
    mem[0] = 0xED; mem[1] = 0x57; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x42);
  });

  it('LD A,R loads R into A (R is incremented once per step before execED)', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.R = 0x55;
    mem[0] = 0xED; mem[1] = 0x5F; mem[2] = 0x76;
    // step() increments R once: R=0x55+1=0x56
    // then execED: case 0x5F => A=R=0x56
    cpu.step(); // executes ED 5F (LD A,R)
    expect(cpu.A).toBe(0x56);
  });

  it('LD I,A stores A into I', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0x77;
    mem[0] = 0xED; mem[1] = 0x47; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.I).toBe(0x77);
  });

  it('LD R,A stores A into R', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0x33;
    mem[0] = 0xED; mem[1] = 0x4F; mem[2] = 0x76;
    cpu.step(); // executes ED 4F (LD R,A) - sets R=A=0x33
    // After LD R,A sets R=0x33, then executing HALT increments R once more
    // But we just ran one step (ED 4F), so R=0x33 now
    // Next step (HALT) would increment R again. Check after one step:
    expect(cpu.R).toBe(0x33);
  });

  it('LD (nn),BC stores BC at nn', () => {
    const mem = new Uint8Array(65536);
    [0x01, 0x34, 0x12, 0xED, 0x43, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x34);
    expect(mem[0x8001]).toBe(0x12);
  });

  it('LD (nn),DE stores DE at nn', () => {
    const mem = new Uint8Array(65536);
    [0x11, 0x78, 0x56, 0xED, 0x53, 0x00, 0x90, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x9000]).toBe(0x78);
    expect(mem[0x9001]).toBe(0x56);
  });

  it('LD (nn),HL via ED prefix', () => {
    const mem = new Uint8Array(65536);
    [0x21, 0xBC, 0x9A, 0xED, 0x63, 0x00, 0xA0, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0xA000]).toBe(0xBC);
    expect(mem[0xA001]).toBe(0x9A);
  });

  it('LD (nn),SP stores SP at nn', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x1234;
    [0xED, 0x73, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0x34);
    expect(mem[0x8001]).toBe(0x12);
  });

  it('LD BC,(nn) loads BC from nn', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x34; mem[0x8001] = 0x12;
    [0xED, 0x4B, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.BC).toBe(0x1234);
  });

  it('LD DE,(nn) loads DE from nn', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0x78; mem[0x8001] = 0x56;
    [0xED, 0x5B, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.DE).toBe(0x5678);
  });

  it('LD HL,(nn) via ED prefix', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0xBC; mem[0x8001] = 0x9A;
    [0xED, 0x6B, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.HL).toBe(0x9ABC);
  });

  it('LD SP,(nn) loads SP from nn', () => {
    const mem = new Uint8Array(65536);
    mem[0x8000] = 0xFF; mem[0x8001] = 0x1F;
    [0xED, 0x7B, 0x00, 0x80, 0x76].forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(cpu.SP).toBe(0x1FFF);
  });

  it('LDI copies one byte and decrements BC', () => {
    const mem = new Uint8Array(65536);
    mem[0x1000] = 0xAB;
    [0x21, 0x00, 0x10, 0x11, 0x00, 0x20, 0x01, 0x03, 0x00, 0xED, 0xA0, 0x76]
      .forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x2000]).toBe(0xAB);
    expect(cpu.BC).toBe(2);
    expect(cpu.HL).toBe(0x1001);
    expect(cpu.DE).toBe(0x2001);
  });

  it('LDD copies one byte going backwards', () => {
    const mem = new Uint8Array(65536);
    mem[0x1002] = 0xCD;
    // LD HL,0x1002; LD DE,0x2002; LD BC,3; LDD
    [0x21, 0x02, 0x10, 0x11, 0x02, 0x20, 0x01, 0x03, 0x00, 0xED, 0xA8, 0x76]
      .forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x2002]).toBe(0xCD);
    expect(cpu.BC).toBe(2);
  });

  it('LDDR copies until BC=0', () => {
    const mem = new Uint8Array(65536);
    mem[0x1002] = 0x11; mem[0x1001] = 0x22; mem[0x1000] = 0x33;
    // LD HL,0x1002; LD DE,0x2002; LD BC,3; LDDR
    [0x21, 0x02, 0x10, 0x11, 0x02, 0x20, 0x01, 0x03, 0x00, 0xED, 0xB8, 0x76]
      .forEach((b, i) => { mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();
    expect(mem[0x2002]).toBe(0x11);
    expect(mem[0x2001]).toBe(0x22);
    expect(mem[0x2000]).toBe(0x33);
    expect(cpu.BC).toBe(0);
  });

  it('NEG negates A (0 - A)', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0x05;
    mem[0] = 0xED; mem[1] = 0x44; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0xFB); // 0 - 5 = -5 = 0xFB
    expect(cpu.fN).toBe(1);
  });

  it('RETI pops PC', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFD;
    mem[0x8FFD] = 0x05; mem[0x8FFE] = 0x00; // return address 0x0005
    mem[0] = 0xED; mem[1] = 0x4D; // RETI
    mem[5] = 0x76; // HALT at return address
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });

  it('RETN pops PC', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.SP = 0x8FFD;
    mem[0x8FFD] = 0x05; mem[0x8FFE] = 0x00;
    mem[0] = 0xED; mem[1] = 0x45; // RETN
    mem[5] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });

  it('CPI compares A with (HL) and increments HL', () => {
    const mem = new Uint8Array(65536);
    mem[0x1000] = 0x42;
    const cpu = new Z80(mem);
    cpu.A = 0x42;
    cpu.HL = 0x1000;
    cpu.BC = 3;
    mem[0] = 0xED; mem[1] = 0xA1; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.fZ).toBe(1); // A == (HL)
    expect(cpu.HL).toBe(0x1001);
    expect(cpu.BC).toBe(2);
  });

  it('CPIR searches for match', () => {
    const mem = new Uint8Array(65536);
    // Put 0x42 at third position
    mem[0x1000] = 0x00; mem[0x1001] = 0x00; mem[0x1002] = 0x42;
    const cpu = new Z80(mem);
    cpu.A = 0x42;
    cpu.HL = 0x1000;
    cpu.BC = 5;
    mem[0] = 0xED; mem[1] = 0xB1; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.fZ).toBe(1);
    expect(cpu.HL).toBe(0x1003); // stopped after matching at 0x1002
  });

  it('IN B,(C) zeroes B (emulator stub)', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.B = 0xFF;
    mem[0] = 0xED; mem[1] = 0x40; mem[2] = 0x76; // IN B,(C)
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0);
  });

  it('IN C,(C) zeroes C', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.C = 0xFF;
    mem[0] = 0xED; mem[1] = 0x48; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.C).toBe(0);
  });

  it('IN D,(C) zeroes D', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.D = 0xFF;
    mem[0] = 0xED; mem[1] = 0x50; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.D).toBe(0);
  });

  it('IN E,(C) zeroes E', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.E = 0xFF;
    mem[0] = 0xED; mem[1] = 0x58; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.E).toBe(0);
  });

  it('IN H,(C) zeroes H', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.H = 0xFF;
    mem[0] = 0xED; mem[1] = 0x60; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.H).toBe(0);
  });

  it('IN L,(C) zeroes L', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.L = 0xFF;
    mem[0] = 0xED; mem[1] = 0x68; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.L).toBe(0);
  });

  it('IN A,(C) zeroes A', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0xFF;
    mem[0] = 0xED; mem[1] = 0x78; mem[2] = 0x76;
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0);
  });
});

// ─── IN A,(n) / OUT (n),A ─────────────────────────────────────────────────────

describe('IN A,(n) and OUT (n),A', () => {
  it('IN A,(n) (0xDB) is a no-op stub that consumes n', () => {
    // LD A,0x55; IN A,(0x01); HALT => A unchanged
    const { cpu } = run([0x3E, 0x55, 0xDB, 0x01, 0x76]);
    // The emulator just skips the port read; A stays as set
    expect(cpu.A).toBe(0x55);
    expect(cpu.PC).toBe(5);
  });

  it('OUT (n),A (0xD3) is a no-op stub that consumes n', () => {
    // LD A,0xAA; OUT (0x02),A; HALT
    const { cpu } = run([0x3E, 0xAA, 0xD3, 0x02, 0x76]);
    expect(cpu.A).toBe(0xAA);
    expect(cpu.PC).toBe(5);
  });
});
