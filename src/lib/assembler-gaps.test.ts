import { describe, it, expect } from 'vitest';
import { assemble } from './assembler';

// assembler.ts lines 305-316: LD HL,(nn) and LD BC/DE/SP,(nn) — now reachable after fixing
// the over-broad REGS16 guard that previously intercepted these instructions.
describe('asmLD — LD HL,(nn) and LD rr,(nn) ED-prefix loads (lines 305-316)', () => {
  it('LD HL,(nn) emits 0x2A', () => {
    const { bytes, errors } = assemble('LD HL, (0x1234)');
    expect(errors).toHaveLength(0);
    expect(bytes[0]).toBe(0x2A);
    expect(bytes[1]).toBe(0x34);
    expect(bytes[2]).toBe(0x12);
  });

  it('LD BC,(nn) emits ED 4B', () => {
    const { bytes, errors } = assemble('LD BC, (0x1234)');
    expect(errors).toHaveLength(0);
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x4B);
    expect(bytes[2]).toBe(0x34);
    expect(bytes[3]).toBe(0x12);
  });

  it('LD DE,(nn) emits ED 5B', () => {
    const { bytes } = assemble('LD DE, (0x5678)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x5B);
  });

  it('LD SP,(nn) emits ED 7B', () => {
    const { bytes } = assemble('LD SP, (0xABCD)');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0x7B);
  });

  it('LD SP,HL emits 0xF9', () => {
    expect(assemble('LD SP, HL').bytes[0]).toBe(0xF9);
  });

  it('LD SP,IX emits DD F9', () => {
    const { bytes } = assemble('LD SP, IX');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0xF9);
  });

  it('LD SP,IY emits FD F9', () => {
    const { bytes } = assemble('LD SP, IY');
    expect(bytes[0]).toBe(0xFD);
    expect(bytes[1]).toBe(0xF9);
  });
});

// assembler.ts line 366: ADD/SUB/etc. A,(HL) form  src==='(HL)'
describe('asmALU — (HL) operand form (line 366)', () => {
  it('ADD A,(HL) emits 0x86', () => {
    expect(assemble('ADD A, (HL)').bytes[0]).toBe(0x86);
  });
  it('SUB (HL) emits 0x96', () => {
    expect(assemble('SUB (HL)').bytes[0]).toBe(0x96);
  });
  it('AND (HL) emits 0xA6', () => {
    expect(assemble('AND (HL)').bytes[0]).toBe(0xA6);
  });
  it('OR (HL) emits 0xB6', () => {
    expect(assemble('OR (HL)').bytes[0]).toBe(0xB6);
  });
  it('XOR (HL) emits 0xAE', () => {
    expect(assemble('XOR (HL)').bytes[0]).toBe(0xAE);
  });
  it('CP (HL) emits 0xBE', () => {
    expect(assemble('CP (HL)').bytes[0]).toBe(0xBE);
  });
});

// assembler.ts lines 368-370: immediate fallback in asmALU
describe('asmALU — immediate operand fallback (lines 368-370)', () => {
  it('ADD A,n emits 0xC6', () => {
    const { bytes } = assemble('ADD A, 5');
    expect(bytes[0]).toBe(0xC6);
    expect(bytes[1]).toBe(5);
  });
  it('ADC A,n emits 0xCE', () => {
    expect(assemble('ADC A, 10').bytes[0]).toBe(0xCE);
  });
  it('SUB n emits 0xD6', () => {
    expect(assemble('SUB 3').bytes[0]).toBe(0xD6);
  });
  it('SBC A,n emits 0xDE', () => {
    expect(assemble('SBC A, 1').bytes[0]).toBe(0xDE);
  });
  it('AND n emits 0xE6', () => {
    expect(assemble('AND 0xF0').bytes[0]).toBe(0xE6);
  });
  it('XOR n emits 0xEE', () => {
    expect(assemble('XOR 0xFF').bytes[0]).toBe(0xEE);
  });
  it('OR n emits 0xF6', () => {
    expect(assemble('OR 0x01').bytes[0]).toBe(0xF6);
  });
  it('CP n emits 0xFE', () => {
    expect(assemble('CP 0x42').bytes[0]).toBe(0xFE);
  });
});

// assembler.ts line 398: conditional JP cc,nn
describe('asmJP — conditional form hits line 398', () => {
  it('JP PO,nn emits 0xE2', () => {
    const { bytes } = assemble('JP PO, 0x0100');
    expect(bytes[0]).toBe(0xE2);
  });
  it('JP PE,nn emits 0xEA', () => {
    const { bytes } = assemble('JP PE, 0x0100');
    expect(bytes[0]).toBe(0xEA);
  });
  it('JP P,nn emits 0xF2', () => {
    const { bytes } = assemble('JP P, 0x0100');
    expect(bytes[0]).toBe(0xF2);
  });
  it('JP M,nn emits 0xFA', () => {
    const { bytes } = assemble('JP M, 0x0200');
    expect(bytes[0]).toBe(0xFA);
  });
});

// assembler.ts line 399: JP fallback — two operands, first is not a valid condition code
describe('asmJP — unknown condition code fallback (line 399)', () => {
  it('JP with unrecognised cc falls back to JP on first operand', () => {
    // 'JP XX, 0x0050' — XX is not a condition, falls to line 399
    const { bytes } = assemble('JP XX, 0x0050');
    expect(bytes[0]).toBe(0xC3); // falls back to unconditional JP
  });
});
