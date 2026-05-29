import { describe, it, expect } from 'vitest';
import { assemble, parseNum } from './assembler';

describe('parseNum', () => {
  it('parses decimal', () => expect(parseNum('42')).toBe(42));
  it('parses 0x hex', () => expect(parseNum('0xFF')).toBe(255));
  it('parses H-suffix hex', () => expect(parseNum('1Ah')).toBe(26));
  it('parses $ hex', () => expect(parseNum('$FF')).toBe(255));
  it('parses binary with B suffix', () => expect(parseNum('1010b')).toBe(10));
  it('parses binary with % prefix', () => expect(parseNum('%1010')).toBe(10));
  it('returns 0 for empty string', () => expect(parseNum('')).toBe(0));
});

describe('assemble - basic instructions', () => {
  it('NOP produces 0x00', () => {
    const r = assemble('NOP\nHALT');
    expect(r.errors).toHaveLength(0);
    expect(r.bytes[0]).toBe(0x00);
    expect(r.bytes[1]).toBe(0x76);
  });

  it('HALT produces 0x76', () => {
    expect(assemble('HALT').bytes[0]).toBe(0x76);
  });

  it('LD A,n', () => {
    const { bytes } = assemble('LD A, 0x42');
    expect(bytes[0]).toBe(0x3E);
    expect(bytes[1]).toBe(0x42);
  });

  it('LD BC,nn', () => {
    const { bytes } = assemble('LD BC, 0x1234');
    expect(bytes[0]).toBe(0x01);
    expect(bytes[1]).toBe(0x34); // lo
    expect(bytes[2]).toBe(0x12); // hi
  });

  it('LD B,A', () => {
    expect(assemble('LD B, A').bytes[0]).toBe(0x47);
  });

  it('LD (HL),A', () => {
    expect(assemble('LD (HL), A').bytes[0]).toBe(0x77);
  });

  it('ADD A,B', () => {
    expect(assemble('ADD A, B').bytes[0]).toBe(0x80);
  });

  it('SUB C', () => {
    expect(assemble('SUB C').bytes[0]).toBe(0x91);
  });

  it('INC A', () => {
    expect(assemble('INC A').bytes[0]).toBe(0x3C);
  });

  it('DEC BC', () => {
    const { bytes } = assemble('DEC BC');
    expect(bytes[0]).toBe(0x0B);
  });

  it('JP nn', () => {
    const { bytes } = assemble('JP 0x0100');
    expect(bytes[0]).toBe(0xC3);
    expect(bytes[1]).toBe(0x00);
    expect(bytes[2]).toBe(0x01);
  });

  it('JR NZ,offset', () => {
    // target is at addr 0, offset = 0 - (0+2) = -2 = 0xFE
    const { bytes } = assemble('JR NZ, 0');
    expect(bytes[0]).toBe(0x20);
  });

  it('CALL nn', () => {
    const { bytes } = assemble('CALL 0x0200');
    expect(bytes[0]).toBe(0xCD);
  });

  it('RET', () => {
    expect(assemble('RET').bytes[0]).toBe(0xC9);
  });

  it('PUSH BC', () => {
    expect(assemble('PUSH BC').bytes[0]).toBe(0xC5);
  });

  it('POP HL', () => {
    expect(assemble('POP HL').bytes[0]).toBe(0xE1);
  });

  it('LDIR', () => {
    const { bytes } = assemble('LDIR');
    expect(bytes[0]).toBe(0xED);
    expect(bytes[1]).toBe(0xB0);
  });

  it('RLC A (CB prefix)', () => {
    const { bytes } = assemble('RLC A');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x07);
  });

  it('BIT 3,B', () => {
    const { bytes } = assemble('BIT 3, B');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0x58);
  });

  it('SET 0,A', () => {
    const { bytes } = assemble('SET 0, A');
    expect(bytes[0]).toBe(0xCB);
    expect(bytes[1]).toBe(0xC7);
  });

  it('LD IX,nn (DD prefix)', () => {
    const { bytes } = assemble('LD IX, 0x1234');
    expect(bytes[0]).toBe(0xDD);
    expect(bytes[1]).toBe(0x21);
    expect(bytes[2]).toBe(0x34);
    expect(bytes[3]).toBe(0x12);
  });
});

describe('assemble - directives', () => {
  it('ORG sets the start address', () => {
    const r = assemble('ORG 0x0100\nNOP');
    expect(r.bytes[0x0100]).toBe(0x00);
    expect(r.bytes[0]).toBeUndefined();
  });

  it('DB emits bytes', () => {
    const { bytes } = assemble('DB 0x01, 0x02, 0x03');
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe(2);
    expect(bytes[2]).toBe(3);
  });

  it('DB emits a quoted string', () => {
    const { bytes } = assemble('DB "ABC"');
    expect(bytes[0]).toBe(65); // A
    expect(bytes[1]).toBe(66); // B
    expect(bytes[2]).toBe(67); // C
  });

  it('DB handles a quoted string containing a comma', () => {
    const { bytes } = assemble('DB "Hi, World"');
    expect(bytes[0]).toBe(72);  // H
    expect(bytes[1]).toBe(105); // i
    expect(bytes[2]).toBe(44);  // ,
    expect(bytes[3]).toBe(32);  // space
    expect(bytes[4]).toBe(87);  // W
  });

  it('DW emits little-endian 16-bit word', () => {
    const { bytes } = assemble('DW 0x1234');
    expect(bytes[0]).toBe(0x34);
    expect(bytes[1]).toBe(0x12);
  });

  it('DS reserves zeroed space', () => {
    const { bytes, size } = assemble('DS 4');
    expect(size).toBe(4);
    expect(bytes[0]).toBe(0);
    expect(bytes[3]).toBe(0);
  });

  it('EQU defines a constant', () => {
    const { bytes } = assemble('VAL EQU 0x42\nLD A, VAL');
    expect(bytes[0]).toBe(0x3E);
    expect(bytes[1]).toBe(0x42);
  });
});

describe('assemble - labels', () => {
  it('forward label resolves in JP', () => {
    const src = 'JP END\nNOP\nEND:\nHALT';
    const { bytes, errors } = assemble(src);
    expect(errors).toHaveLength(0);
    // JP = 3 bytes, NOP = 1 byte → END is at address 4
    expect(bytes[1]).toBe(0x04);
    expect(bytes[2]).toBe(0x00);
  });

  it('backward label resolves in JR', () => {
    // LOOP: NOP; JR LOOP → offset = 0 - (1+2) = -3 = 0xFD
    const { bytes, errors } = assemble('LOOP:\nNOP\nJR LOOP');
    expect(errors).toHaveLength(0);
    expect(bytes[2]).toBe(0xFD);
  });

  it('records label addresses', () => {
    const { labels } = assemble('NOP\nFOO:\nNOP');
    expect(labels['FOO']).toBe(1);
  });
});

describe('assemble - errors', () => {
  it('returns an error for unknown mnemonics', () => {
    const { errors } = assemble('BADOP');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/BADOP/i);
  });

  it('relative jump out of range produces an error', () => {
    // JR to address 200 from 0 — offset 198 > 127
    const src = 'JR 200';
    const { errors } = assemble(src);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('assemble - full program round-trips', () => {
  it('assembles a DJNZ loop that sums 1..10', async () => {
    const src = `
      LD A, 0
      LD B, 10
LOOP:
      ADD A, B
      DJNZ LOOP
      HALT
    `;
    const { bytes, errors } = assemble(src);
    expect(errors).toHaveLength(0);

    const mem = new Uint8Array(65536);
    bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });

    const { Z80 } = await import('./z80');
    const cpu = new Z80(mem);
    let steps = 0;
    while (!cpu.halted && steps < 1000) { cpu.step(); steps++; }
    expect(cpu.A).toBe(55);
  });

  it('assembles LDIR block copy', async () => {
    const src = `
      ORG 0x0000
      LD DE, 0x8000
      LD HL, msg
      LD BC, 5
      LDIR
      HALT
msg:
      DB "Hello"
    `;
    const { bytes, errors } = assemble(src);
    expect(errors).toHaveLength(0);

    const mem = new Uint8Array(65536);
    bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });

    const { Z80 } = await import('./z80');
    const cpu = new Z80(mem);
    let steps = 0;
    while (!cpu.halted && steps < 1000) { cpu.step(); steps++; }
    expect(mem[0x8000]).toBe(72);  // H
    expect(mem[0x8001]).toBe(101); // e
    expect(mem[0x8002]).toBe(108); // l
    expect(mem[0x8003]).toBe(108); // l
    expect(mem[0x8004]).toBe(111); // o
  });
});
