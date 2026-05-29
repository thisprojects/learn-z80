import { describe, it, expect } from 'vitest';
import { assemble } from './assembler';

// ─── asmLD extended ───────────────────────────────────────────────────────────

describe('asmLD - IX/IY displacement stores', () => {
  it('LD (IX+3),B', () => {
    const { bytes, errors } = assemble('LD (IX+3), B');
    expect(errors).toHaveLength(0);
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x70); // 0x70 | REGS8[B]=0 => 0x70
    expect(bytes[2]).toBe(3);
  });

  it('LD (IX+4),C', () => {
    const { bytes } = assemble('LD (IX+4), C');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x71); // 0x70 | REGS8[C]=1
    expect(bytes[2]).toBe(4);
  });

  it('LD (IX+5),D', () => {
    const { bytes } = assemble('LD (IX+5), D');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x72);
    expect(bytes[2]).toBe(5);
  });

  it('LD (IX+6),E', () => {
    const { bytes } = assemble('LD (IX+6), E');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x73);
    expect(bytes[2]).toBe(6);
  });

  it('LD (IX+7),H', () => {
    const { bytes } = assemble('LD (IX+7), H');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x74);
    expect(bytes[2]).toBe(7);
  });

  it('LD (IX+8),L', () => {
    const { bytes } = assemble('LD (IX+8), L');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x75);
    expect(bytes[2]).toBe(8);
  });

  it('LD (IX+9),A', () => {
    const { bytes } = assemble('LD (IX+9), A');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x77);
    expect(bytes[2]).toBe(9);
  });

  it('LD (IY+3),B', () => {
    const { bytes, errors } = assemble('LD (IY+3), B');
    expect(errors).toHaveLength(0);
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x70);
    expect(bytes[2]).toBe(3);
  });

  it('LD (IX+d),n immediate throws error (assembler does not support this form)', () => {
    // dstIX matches (IX+2), but src='0X42' is not in REGS8 => Bad LD thrown
    const { errors } = assemble('LD (IX+2), 0x42');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('asmLD - LD r,(IY+d) variants', () => {
  it('LD B,(IY+3)', () => {
    const { bytes } = assemble('LD B, (IY+3)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x46); // 0x46 | (REGS8[B]=0 << 3)
    expect(bytes[2]).toBe(3);
  });

  it('LD C,(IY+4)', () => {
    const { bytes } = assemble('LD C, (IY+4)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x4E); // 0x46 | (1 << 3)
    expect(bytes[2]).toBe(4);
  });

  it('LD D,(IY+5)', () => {
    const { bytes } = assemble('LD D, (IY+5)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x56);
    expect(bytes[2]).toBe(5);
  });

  it('LD E,(IY+6)', () => {
    const { bytes } = assemble('LD E, (IY+6)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x5E);
    expect(bytes[2]).toBe(6);
  });

  it('LD H,(IY+7)', () => {
    const { bytes } = assemble('LD H, (IY+7)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x66);
    expect(bytes[2]).toBe(7);
  });

  it('LD L,(IY+8)', () => {
    const { bytes } = assemble('LD L, (IY+8)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x6E);
    expect(bytes[2]).toBe(8);
  });

  it('LD A,(IY+9)', () => {
    const { bytes } = assemble('LD A, (IY+9)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x7E);
    expect(bytes[2]).toBe(9);
  });
});

describe('asmLD - LD r,(IX+d) variants', () => {
  it('LD B,(IX+1)', () => {
    const { bytes } = assemble('LD B, (IX+1)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x46);
    expect(bytes[2]).toBe(1);
  });

  it('LD C,(IX+2)', () => {
    const { bytes } = assemble('LD C, (IX+2)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x4E);
    expect(bytes[2]).toBe(2);
  });

  it('LD D,(IX+3)', () => {
    const { bytes } = assemble('LD D, (IX+3)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x56);
  });

  it('LD E,(IX+4)', () => {
    const { bytes } = assemble('LD E, (IX+4)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x5E);
  });

  it('LD H,(IX+5)', () => {
    const { bytes } = assemble('LD H, (IX+5)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x66);
  });

  it('LD L,(IX+6)', () => {
    const { bytes } = assemble('LD L, (IX+6)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x6E);
  });
});

describe('asmLD - SP from index', () => {
  it('LD SP,IX emits DD F9', () => {
    const { bytes } = assemble('LD SP, IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xF9);
  });

  it('LD SP,HL emits F9', () => {
    const { bytes } = assemble('LD SP, HL');
    expect(bytes[0]).toBe(0xF9);
  });
});

describe('asmLD - (nn),IX and IX,(nn)', () => {
  // LD IX,(0x8000): dst='IX', src='(0X8000)'. dst==='IX' branch fires: getN16('(0X8000)')
  // parseNum('(0X8000)') = 0 (NaN), so we get [0xDD, 0x21, 0x00, 0x00]
  // The actual load-from-memory path (0xDD,0x2A) is only triggered by the assembler
  // if src has format (nn) - but that branch is at dst==='IX' => getN16(src).
  it('LD IX,(0x8000) - assembler parses src as immediate value', () => {
    const { bytes } = assemble('LD IX, (0x8000)');
    // dst=IX => [0xDD, 0x21, lo, hi] where getN16('(0X8000)') is parsed
    // getN16 calls parseNum('(0X8000)') which returns NaN->0
    // Actually wait: getN16 first checks labels, then src==='$', then parseNum
    // parseNum('(0X8000)') - doesn't start with 0x (has '('), doesn't end with H/h/B/b
    // parseInt('(0X8000)', 10) = NaN => returns 0
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x21); // LD IX,nn (not load from memory)
  });

  // LD (0x8000),IX: dst='(0X8000)', src='IX'
  // Doesn't match (HL), doesn't match (BC)/(DE), doesn't match A patterns
  // Eventually throws: "Bad LD" — test that it errors or returns something
  it('LD (0x8000),IX results in error or falls through (dead code path)', () => {
    const { errors } = assemble('LD (0x8000), IX');
    // The assembler doesn't have a (nn),IX path that works properly
    // It should throw Bad LD
    expect(errors.length).toBeGreaterThan(0);
  });

  it('LD (0x8000),HL uses 0x22 opcode', () => {
    const { bytes } = assemble('LD (0x8000), HL');
    expect(bytes[0]).toBe(0x22);
    expect(bytes[1]).toBe(0x00);
    expect(bytes[2]).toBe(0x80);
  });

  it('LD HL,(0x8000) uses 0x2A opcode', () => {
    const { bytes } = assemble('LD HL, (0x8000)');
    expect(bytes[0]).toBe(0x2A);
    expect(bytes[1]).toBe(0x00);
    expect(bytes[2]).toBe(0x80);
  });

  it('LD IY,0x1234 stores IY immediate', () => {
    const { bytes } = assemble('LD IY, 0x1234');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x21);
    expect(bytes[2]).toBe(0x34);
    expect(bytes[3]).toBe(0x12);
  });
});

describe('asmLD - LD A,I / LD A,R / LD I,A / LD R,A', () => {
  // In the assembler, dst='A' is in REGS8 and src='I' has no '(', so
  // the immediate-load branch (line 266) fires: returns [0x3E, parseNum('I') & 0xFF]
  // The special LD A,I path at line 334 is dead code.
  it('LD A,I is treated as LD A,immediate by assembler (dead code path)', () => {
    const { bytes } = assemble('LD A, I');
    // dst in REGS8 && no '(' in src => [bases[dst], parseNum('I') & 0xFF]
    expect(bytes[0]).toBe(0x3E); // LD A,n
    expect(bytes[1]).toBe(0x00); // parseNum('I') = 0
  });

  it('LD A,R is treated as LD A,immediate by assembler', () => {
    const { bytes } = assemble('LD A, R');
    expect(bytes[0]).toBe(0x3E); // LD A,n
  });

  // LD I,A: dst='I', not in REGS8, not (HL), not A, not REGS16, not IX/IY, not SP
  // Falls through to ixMatch/iyMatch patterns which don't match, then...
  // Line 334: dst==='A'? No. Line 335: dst==='A'? No. Line 336: dst==='I'? Yes!
  it('LD I,A produces ED 47', () => {
    const { bytes } = assemble('LD I, A');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x47);
  });

  it('LD R,A produces ED 4F', () => {
    const { bytes } = assemble('LD R, A');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x4F);
  });
});

describe('asmLD - (nn),BC/DE/SP and reverse', () => {
  // (nn),BC: dst='(0X8000)' is NOT in REGS8 or REGS16,
  // goes through (HL) checks (no), A checks (src='BC' not 'A'),
  // then HL check (src='BC' not 'HL'), then src=BC/DE/SP check (line 308) => matches!
  it('LD (0x8000),BC', () => {
    const { bytes } = assemble('LD (0x8000), BC');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x43);
    expect(bytes[2]).toBe(0x00);
    expect(bytes[3]).toBe(0x80);
  });

  it('LD (0x8000),DE', () => {
    const { bytes } = assemble('LD (0x8000), DE');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x53);
  });

  it('LD (0x8000),SP', () => {
    const { bytes } = assemble('LD (0x8000), SP');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x73);
  });

  it('LD BC,(0x8000) emits ED 4B', () => {
    const { bytes } = assemble('LD BC, (0x8000)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x4B);
    expect(bytes[2]).toBe(0x00);
    expect(bytes[3]).toBe(0x80);
  });

  it('LD DE,(0x8000) emits ED 5B', () => {
    const { bytes } = assemble('LD DE, (0x8000)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x5B);
  });

  it('LD SP,(0x8000) emits ED 7B', () => {
    const { bytes } = assemble('LD SP, (0x8000)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x7B);
  });
});

// ─── asmALU extended ─────────────────────────────────────────────────────────

describe('asmALU - ADD HL/IX/IY variants', () => {
  it('ADD HL,SP', () => {
    const { bytes } = assemble('ADD HL, SP');
    expect(bytes[0]).toBe(0x39);
  });

  it('ADD IX,BC', () => {
    const { bytes } = assemble('ADD IX, BC');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x09);
  });

  it('ADD IX,DE', () => {
    const { bytes } = assemble('ADD IX, DE');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x19);
  });

  it('ADD IX,IX', () => {
    const { bytes } = assemble('ADD IX, IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x29);
  });

  it('ADD IX,SP', () => {
    const { bytes } = assemble('ADD IX, SP');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x39);
  });

  it('ADD IY,BC', () => {
    const { bytes } = assemble('ADD IY, BC');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x09);
  });

  it('ADD IY,SP', () => {
    const { bytes } = assemble('ADD IY, SP');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x39);
  });
});

describe('asmALU - ADC HL variants', () => {
  it('ADC HL,BC', () => {
    const { bytes } = assemble('ADC HL, BC');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x4A);
  });

  it('ADC HL,DE', () => {
    const { bytes } = assemble('ADC HL, DE');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x5A);
  });

  it('ADC HL,HL', () => {
    const { bytes } = assemble('ADC HL, HL');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x6A);
  });

  it('ADC HL,SP', () => {
    const { bytes } = assemble('ADC HL, SP');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x7A);
  });
});

describe('asmALU - SBC HL variants', () => {
  it('SBC HL,BC', () => {
    const { bytes } = assemble('SBC HL, BC');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x42);
  });

  it('SBC HL,DE', () => {
    const { bytes } = assemble('SBC HL, DE');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x52);
  });

  it('SBC HL,SP', () => {
    const { bytes } = assemble('SBC HL, SP');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x72);
  });
});

describe('asmALU - (HL) operand forms', () => {
  it('ADD A,(HL)', () => {
    const { bytes } = assemble('ADD A, (HL)');
    expect(bytes[0]).toBe(0x86);
  });

  it('SUB (HL)', () => {
    const { bytes } = assemble('SUB (HL)');
    expect(bytes[0]).toBe(0x96);
  });

  it('AND (HL)', () => {
    const { bytes } = assemble('AND (HL)');
    expect(bytes[0]).toBe(0xA6);
  });

  it('XOR (HL)', () => {
    const { bytes } = assemble('XOR (HL)');
    expect(bytes[0]).toBe(0xAE);
  });

  it('OR (HL)', () => {
    const { bytes } = assemble('OR (HL)');
    expect(bytes[0]).toBe(0xB6);
  });

  it('CP (HL)', () => {
    const { bytes } = assemble('CP (HL)');
    expect(bytes[0]).toBe(0xBE);
  });
});

// ─── EX variants ─────────────────────────────────────────────────────────────

describe('EX variants', () => {
  it('EX DE,HL', () => {
    const { bytes } = assemble('EX DE, HL');
    expect(bytes[0]).toBe(0xEB);
  });

  it("EX AF,AF'", () => {
    const { bytes } = assemble("EX AF, AF'");
    expect(bytes[0]).toBe(0x08);
  });

  it('EX (SP),HL', () => {
    const { bytes } = assemble('EX (SP), HL');
    expect(bytes[0]).toBe(0xE3);
  });

  it('EX (SP),IX', () => {
    const { bytes } = assemble('EX (SP), IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xE3);
  });

  it('EX (SP),IY', () => {
    const { bytes } = assemble('EX (SP), IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0xE3);
  });

  it('EX with bad operands throws', () => {
    const { errors } = assemble('EX BC, DE');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── PUSH/POP IX/IY ───────────────────────────────────────────────────────────

describe('PUSH/POP IX and IY', () => {
  it('PUSH IX', () => {
    const { bytes } = assemble('PUSH IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xE5);
  });

  it('PUSH IY', () => {
    const { bytes } = assemble('PUSH IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0xE5);
  });

  it('POP IX', () => {
    const { bytes } = assemble('POP IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xE1);
  });

  it('POP IY', () => {
    const { bytes } = assemble('POP IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0xE1);
  });

  it('PUSH AF', () => {
    const { bytes } = assemble('PUSH AF');
    expect(bytes[0]).toBe(0xF5);
  });

  it('POP AF', () => {
    const { bytes } = assemble('POP AF');
    expect(bytes[0]).toBe(0xF1);
  });

  it('PUSH with bad reg throws', () => {
    const { errors } = assemble('PUSH ZZ');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('POP with bad reg throws', () => {
    const { errors } = assemble('POP ZZ');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── JP variants ─────────────────────────────────────────────────────────────

describe('JP variants', () => {
  it('JP (HL)', () => {
    const { bytes } = assemble('JP (HL)');
    expect(bytes[0]).toBe(0xE9);
  });

  it('JP (IX)', () => {
    const { bytes } = assemble('JP (IX)');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xE9);
  });

  it('JP (IY)', () => {
    const { bytes } = assemble('JP (IY)');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0xE9);
  });

  it('JP NZ,nn', () => {
    const { bytes } = assemble('JP NZ, 0x0100');
    expect(bytes[0]).toBe(0xC2);
    expect(bytes[1]).toBe(0x00);
    expect(bytes[2]).toBe(0x01);
  });

  it('JP Z,nn', () => {
    const { bytes } = assemble('JP Z, 0x0200');
    expect(bytes[0]).toBe(0xCA);
  });

  it('JP NC,nn', () => {
    const { bytes } = assemble('JP NC, 0x0300');
    expect(bytes[0]).toBe(0xD2);
  });

  it('JP C,nn', () => {
    const { bytes } = assemble('JP C, 0x0400');
    expect(bytes[0]).toBe(0xDA);
  });

  it('JP PO,nn', () => {
    const { bytes } = assemble('JP PO, 0x0500');
    expect(bytes[0]).toBe(0xE2);
  });

  it('JP PE,nn', () => {
    const { bytes } = assemble('JP PE, 0x0600');
    expect(bytes[0]).toBe(0xEA);
  });

  it('JP P,nn', () => {
    const { bytes } = assemble('JP P, 0x0700');
    expect(bytes[0]).toBe(0xF2);
  });

  it('JP M,nn', () => {
    const { bytes } = assemble('JP M, 0x0800');
    expect(bytes[0]).toBe(0xFA);
  });
});

// ─── JR variants ─────────────────────────────────────────────────────────────

describe('JR variants', () => {
  it('JR NZ,target', () => {
    // JR NZ targeting address 0 => offset 0 - (0+2) = -2 = 0xFE
    const { bytes } = assemble('JR NZ, 0');
    expect(bytes[0]).toBe(0x20);
    expect(bytes[1]).toBe(0xFE);
  });

  it('JR Z,target', () => {
    const { bytes } = assemble('JR Z, 0');
    expect(bytes[0]).toBe(0x28);
  });

  it('JR NC,target', () => {
    const { bytes } = assemble('JR NC, 0');
    expect(bytes[0]).toBe(0x30);
  });

  it('JR C,target', () => {
    const { bytes } = assemble('JR C, 0');
    expect(bytes[0]).toBe(0x38);
  });

  it('JR with bad condition throws', () => {
    const { errors } = assemble('JR PO, 0');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── DJNZ ─────────────────────────────────────────────────────────────────────

describe('DJNZ', () => {
  it('DJNZ with label', () => {
    const src = 'LOOP:\nNOP\nDJNZ LOOP';
    const { bytes, errors } = assemble(src);
    expect(errors).toHaveLength(0);
    expect(bytes[1]).toBe(0x10); // DJNZ opcode
    expect(bytes[2]).toBe(0xFD); // -3: LOOP is at 0, DJNZ is at addr 1, addr+2=3, 0-3=-3=0xFD
  });
});

// ─── Conditional CALL ────────────────────────────────────────────────────────

describe('asmCALL - all conditions', () => {
  it('CALL NZ,nn', () => {
    const { bytes } = assemble('CALL NZ, 0x1000');
    expect(bytes[0]).toBe(0xC4);
  });

  it('CALL Z,nn', () => {
    const { bytes } = assemble('CALL Z, 0x1000');
    expect(bytes[0]).toBe(0xCC);
  });

  it('CALL NC,nn', () => {
    const { bytes } = assemble('CALL NC, 0x1000');
    expect(bytes[0]).toBe(0xD4);
  });

  it('CALL C,nn', () => {
    const { bytes } = assemble('CALL C, 0x1000');
    expect(bytes[0]).toBe(0xDC);
  });

  it('CALL PO,nn', () => {
    const { bytes } = assemble('CALL PO, 0x1000');
    expect(bytes[0]).toBe(0xE4);
  });

  it('CALL PE,nn', () => {
    const { bytes } = assemble('CALL PE, 0x1000');
    expect(bytes[0]).toBe(0xEC);
  });

  it('CALL P,nn', () => {
    const { bytes } = assemble('CALL P, 0x1000');
    expect(bytes[0]).toBe(0xF4);
  });

  it('CALL M,nn', () => {
    const { bytes } = assemble('CALL M, 0x1000');
    expect(bytes[0]).toBe(0xFC);
  });

  it('CALL with bad condition throws', () => {
    const { errors } = assemble('CALL XY, 0x1000');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── Conditional RET ─────────────────────────────────────────────────────────

describe('asmRET - all conditions', () => {
  it('RET NZ', () => expect(assemble('RET NZ').bytes[0]).toBe(0xC0));
  it('RET Z',  () => expect(assemble('RET Z').bytes[0]).toBe(0xC8));
  it('RET NC', () => expect(assemble('RET NC').bytes[0]).toBe(0xD0));
  it('RET C',  () => expect(assemble('RET C').bytes[0]).toBe(0xD8));
  it('RET PO', () => expect(assemble('RET PO').bytes[0]).toBe(0xE0));
  it('RET PE', () => expect(assemble('RET PE').bytes[0]).toBe(0xE8));
  it('RET P',  () => expect(assemble('RET P').bytes[0]).toBe(0xF0));
  it('RET M',  () => expect(assemble('RET M').bytes[0]).toBe(0xF8));
  // unknown condition falls through to RET (0xC9)
  it('RET UNKNOWN falls back to RET', () => {
    expect(assemble('RET UNKNOWN').bytes[0]).toBe(0xC9);
  });
});

// ─── RST ─────────────────────────────────────────────────────────────────────

describe('RST', () => {
  it('RST 0x00', () => expect(assemble('RST 0x00').bytes[0]).toBe(0xC7));
  it('RST 0x08', () => expect(assemble('RST 0x08').bytes[0]).toBe(0xCF));
  it('RST 0x10', () => expect(assemble('RST 0x10').bytes[0]).toBe(0xD7));
  it('RST 0x18', () => expect(assemble('RST 0x18').bytes[0]).toBe(0xDF));
  it('RST 0x20', () => expect(assemble('RST 0x20').bytes[0]).toBe(0xE7));
  it('RST 0x28', () => expect(assemble('RST 0x28').bytes[0]).toBe(0xEF));
  it('RST 0x30', () => expect(assemble('RST 0x30').bytes[0]).toBe(0xF7));
  it('RST 0x38', () => expect(assemble('RST 0x38').bytes[0]).toBe(0xFF));
});

// ─── IN / OUT ─────────────────────────────────────────────────────────────────

describe('IN / OUT', () => {
  it('IN A,(n)', () => {
    const { bytes } = assemble('IN A, (5)');
    expect(bytes[0]).toBe(0xDB);
    expect(bytes[1]).toBe(5);
  });

  it('IN B,(C)', () => {
    const { bytes } = assemble('IN B, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x40);
  });

  it('IN C,(C)', () => {
    const { bytes } = assemble('IN C, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x48);
  });

  it('IN D,(C)', () => {
    const { bytes } = assemble('IN D, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x50);
  });

  it('IN E,(C)', () => {
    const { bytes } = assemble('IN E, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x58);
  });

  it('IN H,(C)', () => {
    const { bytes } = assemble('IN H, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x60);
  });

  it('IN L,(C)', () => {
    const { bytes } = assemble('IN L, (C)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x68);
  });

  it('IN with bad reg throws', () => {
    const { errors } = assemble('IN Z, (C)');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('OUT (n),A', () => {
    const { bytes } = assemble('OUT (3), A');
    expect(bytes[0]).toBe(0xD3);
    expect(bytes[1]).toBe(3);
  });
});

// ─── ED single instructions ───────────────────────────────────────────────────

describe('ED single instructions', () => {
  it('NEG', () => {
    const { bytes } = assemble('NEG');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x44);
  });

  it('LDIR', () => {
    const { bytes } = assemble('LDIR');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xB0);
  });

  it('LDDR', () => {
    const { bytes } = assemble('LDDR');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xB8);
  });

  it('LDI', () => {
    const { bytes } = assemble('LDI');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xA0);
  });

  it('LDD', () => {
    const { bytes } = assemble('LDD');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xA8);
  });

  it('CPI', () => {
    const { bytes } = assemble('CPI');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xA1);
  });

  it('CPIR', () => {
    const { bytes } = assemble('CPIR');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xB1);
  });

  it('RETI', () => {
    const { bytes } = assemble('RETI');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x4D);
  });

  it('RETN', () => {
    const { bytes } = assemble('RETN');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x45);
  });
});

// ─── Simple no-arg instructions ───────────────────────────────────────────────

describe('simple no-argument instructions', () => {
  it('RLCA', () => expect(assemble('RLCA').bytes[0]).toBe(0x07));
  it('RRCA', () => expect(assemble('RRCA').bytes[0]).toBe(0x0F));
  it('RLA',  () => expect(assemble('RLA').bytes[0]).toBe(0x17));
  it('RRA',  () => expect(assemble('RRA').bytes[0]).toBe(0x1F));
  it('EI',   () => expect(assemble('EI').bytes[0]).toBe(0xFB));
  it('DI',   () => expect(assemble('DI').bytes[0]).toBe(0xF3));
  it('DAA',  () => expect(assemble('DAA').bytes[0]).toBe(0x27));
  it('CPL',  () => expect(assemble('CPL').bytes[0]).toBe(0x2F));
  it('CCF',  () => expect(assemble('CCF').bytes[0]).toBe(0x3F));
  it('SCF',  () => expect(assemble('SCF').bytes[0]).toBe(0x37));
  it('EXX',  () => expect(assemble('EXX').bytes[0]).toBe(0xD9));
});

// ─── Bit operations (CB prefix) ───────────────────────────────────────────────

describe('BIT, SET, RES on all registers and bits', () => {
  // BIT 0-7 on register B
  for (let b = 0; b <= 7; b++) {
    it(`BIT ${b},B`, () => {
      const { bytes } = assemble(`BIT ${b}, B`);
      expect(bytes[0]).toBe(0xCB);
      expect(bytes[1]).toBe(0x40 | (b << 3) | 0); // B=0
    });
  }

  // BIT on other registers
  it('BIT 0,C', () => {
    const { bytes } = assemble('BIT 0, C');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x41);
  });

  it('BIT 0,D', () => {
    const { bytes } = assemble('BIT 0, D');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x42);
  });

  it('BIT 0,E', () => {
    const { bytes } = assemble('BIT 0, E');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x43);
  });

  it('BIT 0,H', () => {
    const { bytes } = assemble('BIT 0, H');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x44);
  });

  it('BIT 0,L', () => {
    const { bytes } = assemble('BIT 0, L');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x45);
  });

  it('BIT 0,(HL)', () => {
    const { bytes } = assemble('BIT 0, (HL)');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x46);
  });

  // SET
  it('SET 0,B', () => {
    const { bytes } = assemble('SET 0, B');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0xC0);
  });

  it('SET 7,A', () => {
    const { bytes } = assemble('SET 7, A');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0xFF);
  });

  it('SET 3,(HL)', () => {
    const { bytes } = assemble('SET 3, (HL)');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0xDE);
  });

  // RES
  it('RES 0,B', () => {
    const { bytes } = assemble('RES 0, B');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x80);
  });

  it('RES 7,A', () => {
    const { bytes } = assemble('RES 7, A');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0xBF);
  });

  it('RES 3,(HL)', () => {
    const { bytes } = assemble('RES 3, (HL)');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x9E);
  });
});

describe('rotation/shift ops on registers', () => {
  it('SRL B', () => {
    const { bytes } = assemble('SRL B');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x38);
  });

  it('SLA C', () => {
    const { bytes } = assemble('SLA C');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x21);
  });

  it('SRA D', () => {
    const { bytes } = assemble('SRA D');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x2A);
  });

  it('RRC E', () => {
    const { bytes } = assemble('RRC E');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x0B);
  });

  it('RL H', () => {
    const { bytes } = assemble('RL H');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x14);
  });

  it('RR L', () => {
    const { bytes } = assemble('RR L');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x1D);
  });

  it('RLC (HL)', () => {
    const { bytes } = assemble('RLC (HL)');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x06);
  });
});

// ─── INC/DEC IX/IY ───────────────────────────────────────────────────────────

describe('INC/DEC IX/IY', () => {
  it('INC IX', () => {
    const { bytes } = assemble('INC IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x23);
  });

  it('DEC IX', () => {
    const { bytes } = assemble('DEC IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x2B);
  });

  it('INC IY', () => {
    const { bytes } = assemble('INC IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x23);
  });

  it('DEC IY', () => {
    const { bytes } = assemble('DEC IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0x2B);
  });

  it('INC (HL)', () => {
    expect(assemble('INC (HL)').bytes[0]).toBe(0x34);
  });

  it('DEC (HL)', () => {
    expect(assemble('DEC (HL)').bytes[0]).toBe(0x35);
  });

  it('INC/DEC with bad operand throws', () => {
    const { errors } = assemble('INC ZZ');
    expect(errors.length).toBeGreaterThan(0);
  });
});
