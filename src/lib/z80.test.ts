import { describe, it, expect, beforeEach } from 'vitest';
import { Z80 } from './z80';

function makeZ80() {
  const mem = new Uint8Array(65536);
  const cpu = new Z80(mem);
  return { cpu, mem };
}

function loadAndRun(bytes: number[], maxSteps = 1000) {
  const { cpu, mem } = makeZ80();
  bytes.forEach((b, i) => { mem[i] = b; });
  let steps = 0;
  while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
  return cpu;
}

describe('Z80 reset', () => {
  it('initialises all registers to 0 and SP to 0xFFFF', () => {
    const { cpu } = makeZ80();
    expect(cpu.A).toBe(0);
    expect(cpu.BC).toBe(0);
    expect(cpu.DE).toBe(0);
    expect(cpu.HL).toBe(0);
    expect(cpu.IX).toBe(0);
    expect(cpu.IY).toBe(0);
    expect(cpu.SP).toBe(0xFFFF);
    expect(cpu.PC).toBe(0);
    expect(cpu.halted).toBe(false);
  });

  it('reset clears modified registers', () => {
    const { cpu } = makeZ80();
    cpu.A = 0xFF; cpu.BC = 0x1234;
    cpu.reset();
    expect(cpu.A).toBe(0);
    expect(cpu.BC).toBe(0);
    expect(cpu.SP).toBe(0xFFFF);
  });
});

describe('NOP / HALT', () => {
  it('NOP increments PC by 1', () => {
    const { cpu, mem } = makeZ80();
    mem[0] = 0x00; // NOP
    mem[1] = 0x76; // HALT
    cpu.step(); cpu.step();
    expect(cpu.PC).toBe(2);
    expect(cpu.halted).toBe(true);
  });

  it('HALT stops execution', () => {
    const cpu = loadAndRun([0x76]);
    expect(cpu.halted).toBe(true);
    expect(cpu.PC).toBe(1);
  });
});

describe('LD immediate', () => {
  it('LD A,n', () => {
    const cpu = loadAndRun([0x3E, 0x42, 0x76]); // LD A,0x42; HALT
    expect(cpu.A).toBe(0x42);
  });

  it('LD B,n', () => {
    const cpu = loadAndRun([0x06, 0x10, 0x76]);
    expect(cpu.B).toBe(0x10);
  });

  it('LD BC,nn', () => {
    const cpu = loadAndRun([0x01, 0x34, 0x12, 0x76]); // LD BC,0x1234
    expect(cpu.BC).toBe(0x1234);
    expect(cpu.B).toBe(0x12);
    expect(cpu.C).toBe(0x34);
  });

  it('LD HL,nn', () => {
    const cpu = loadAndRun([0x21, 0x00, 0x80, 0x76]); // LD HL,0x8000
    expect(cpu.HL).toBe(0x8000);
  });

  it('LD SP,nn', () => {
    const cpu = loadAndRun([0x31, 0xFF, 0xFF, 0x76]);
    expect(cpu.SP).toBe(0xFFFF);
  });
});

describe('LD register to register', () => {
  it('LD B,A copies A into B', () => {
    const cpu = loadAndRun([0x3E, 0x55, 0x47, 0x76]); // LD A,0x55; LD B,A
    expect(cpu.B).toBe(0x55);
  });

  it('LD A,B copies B into A', () => {
    const cpu = loadAndRun([0x06, 0x77, 0x78, 0x76]); // LD B,0x77; LD A,B
    expect(cpu.A).toBe(0x77);
  });
});

describe('LD memory', () => {
  it('LD (HL),A stores A at memory[HL]', () => {
    const { cpu, mem } = makeZ80();
    // LD HL,0x8000; LD A,0xAB; LD (HL),A; HALT
    [0x21,0x00,0x80, 0x3E,0xAB, 0x77, 0x76].forEach((b,i) => { mem[i]=b; });
    while (!cpu.halted) cpu.step();
    expect(mem[0x8000]).toBe(0xAB);
  });

  it('LD A,(HL) reads memory[HL] into A', () => {
    const { cpu, mem } = makeZ80();
    mem[0x8000] = 0xCD;
    [0x21,0x00,0x80, 0x7E, 0x76].forEach((b,i) => { mem[i]=b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0xCD);
  });

  it('LD (nn),A stores A at absolute address', () => {
    const { cpu, mem } = makeZ80();
    [0x3E,0x99, 0x32,0x00,0x90, 0x76].forEach((b,i) => { mem[i]=b; }); // LD A,0x99; LD (0x9000),A
    while (!cpu.halted) cpu.step();
    expect(mem[0x9000]).toBe(0x99);
  });
});

describe('ALU - ADD', () => {
  it('ADD A,B produces correct sum', () => {
    const cpu = loadAndRun([0x3E,0x0F, 0x06,0x01, 0x80, 0x76]); // LD A,15; LD B,1; ADD A,B
    expect(cpu.A).toBe(16);
    expect(cpu.fC).toBe(0);
    expect(cpu.fZ).toBe(0);
  });

  it('ADD A sets carry flag on overflow', () => {
    const cpu = loadAndRun([0x3E,0xFF, 0x06,0x01, 0x80, 0x76]); // 255+1
    expect(cpu.A).toBe(0);
    expect(cpu.fC).toBe(1);
    expect(cpu.fZ).toBe(1);
  });

  it('ADD A,n immediate', () => {
    const cpu = loadAndRun([0x3E,0x10, 0xC6,0x05, 0x76]); // LD A,16; ADD A,5
    expect(cpu.A).toBe(21);
  });
});

describe('ALU - SUB', () => {
  it('SUB B subtracts B from A', () => {
    const cpu = loadAndRun([0x3E,0x0A, 0x06,0x03, 0x90, 0x76]); // LD A,10; LD B,3; SUB B
    expect(cpu.A).toBe(7);
    expect(cpu.fN).toBe(1);
    expect(cpu.fC).toBe(0);
  });

  it('SUB sets carry when result underflows', () => {
    const cpu = loadAndRun([0x3E,0x01, 0x06,0x02, 0x90, 0x76]);
    expect(cpu.fC).toBe(1);
  });

  it('SUB sets zero flag when result is 0', () => {
    const cpu = loadAndRun([0x3E,0x05, 0x06,0x05, 0x90, 0x76]);
    expect(cpu.A).toBe(0);
    expect(cpu.fZ).toBe(1);
  });
});

describe('ALU - INC / DEC', () => {
  it('INC A increments A', () => {
    const cpu = loadAndRun([0x3E,0x09, 0x3C, 0x76]); // LD A,9; INC A
    expect(cpu.A).toBe(10);
  });

  it('DEC B decrements B', () => {
    const cpu = loadAndRun([0x06,0x05, 0x05, 0x76]); // LD B,5; DEC B
    expect(cpu.B).toBe(4);
    expect(cpu.fN).toBe(1);
  });

  it('INC BC does not affect flags', () => {
    const cpu = loadAndRun([0x01,0xFF,0x00, 0x03, 0x76]); // LD BC,0xFF; INC BC
    expect(cpu.BC).toBe(0x100);
  });
});

describe('AND / OR / XOR / CP', () => {
  it('AND masks bits', () => {
    const cpu = loadAndRun([0x3E,0xFF, 0x06,0x0F, 0xA0, 0x76]); // AND B
    expect(cpu.A).toBe(0x0F);
  });

  it('OR sets bits', () => {
    const cpu = loadAndRun([0x3E,0xF0, 0x06,0x0F, 0xB0, 0x76]); // OR B
    expect(cpu.A).toBe(0xFF);
  });

  it('XOR toggles bits', () => {
    const cpu = loadAndRun([0x3E,0xFF, 0x06,0xFF, 0xA8, 0x76]); // XOR B
    expect(cpu.A).toBe(0x00);
    expect(cpu.fZ).toBe(1);
  });

  it('XOR A clears A', () => {
    const cpu = loadAndRun([0x3E,0x42, 0xAF, 0x76]); // LD A,0x42; XOR A
    expect(cpu.A).toBe(0);
    expect(cpu.fZ).toBe(1);
  });

  it('CP sets Z when equal, does not change A', () => {
    const cpu = loadAndRun([0x3E,0x05, 0x06,0x05, 0xB8, 0x76]); // CP B
    expect(cpu.A).toBe(0x05);
    expect(cpu.fZ).toBe(1);
  });
});

describe('Jumps', () => {
  it('JP nn jumps to address', () => {
    const { cpu, mem } = makeZ80();
    mem[0] = 0xC3; mem[1] = 0x05; mem[2] = 0x00; // JP 0x0005
    mem[5] = 0x76; // HALT
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(6);
  });

  it('JR e takes relative jump', () => {
    const { cpu, mem } = makeZ80();
    mem[0] = 0x18; mem[1] = 0x02; // JR +2
    mem[4] = 0x76; // HALT at 0+2+2=4
    while (!cpu.halted) cpu.step();
    expect(cpu.PC).toBe(5);
  });

  it('JR NZ jumps when Z=0', () => {
    // LD B,3; loop: DEC B; JR NZ,loop; HALT
    const cpu = loadAndRun([0x06,0x03, 0x05, 0x20,0xFD, 0x76]);
    expect(cpu.B).toBe(0);
  });

  it('JR Z does not jump when Z=0', () => {
    const { cpu, mem } = makeZ80();
    // LD A,1; CP 0; JR Z,skip; LD B,0xAA; skip: HALT
    [0x3E,0x01, 0xFE,0x00, 0x28,0x02, 0x06,0xAA, 0x76].forEach((b,i)=>{ mem[i]=b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0xAA);
  });

  it('DJNZ loops B times', () => {
    // LD A,0; LD B,5; loop: INC A; DJNZ loop; HALT
    const cpu = loadAndRun([0x3E,0x00, 0x06,0x05, 0x3C, 0x10,0xFD, 0x76]);
    expect(cpu.A).toBe(5);
    expect(cpu.B).toBe(0);
  });
});

describe('CALL / RET', () => {
  it('CALL pushes PC and jumps, RET pops and returns', () => {
    const { cpu, mem } = makeZ80();
    cpu.SP = 0x8FFF;
    // 0x0000: CALL 0x0006
    mem[0]=0xCD; mem[1]=0x06; mem[2]=0x00;
    // 0x0003: LD A,0x42
    mem[3]=0x3E; mem[4]=0x42;
    // 0x0005: HALT
    mem[5]=0x76;
    // 0x0006: LD B,0x10; RET
    mem[6]=0x06; mem[7]=0x10;
    mem[8]=0xC9;
    while (!cpu.halted) cpu.step();
    expect(cpu.B).toBe(0x10); // subroutine ran
    expect(cpu.A).toBe(0x42); // return address executed
  });
});

describe('PUSH / POP', () => {
  it('PUSH BC / POP DE round-trips the value', () => {
    const { cpu, mem } = makeZ80();
    cpu.SP = 0x8FFF;
    [0x01,0x34,0x12, 0xC5, 0xD1, 0x76].forEach((b,i)=>{ mem[i]=b; });
    // LD BC,0x1234; PUSH BC; POP DE; HALT
    while (!cpu.halted) cpu.step();
    expect(cpu.DE).toBe(0x1234);
    expect(cpu.SP).toBe(0x8FFF); // restored
  });
});

describe('EX DE,HL', () => {
  it('swaps DE and HL', () => {
    const cpu = loadAndRun([0x11,0x34,0x12, 0x21,0x78,0x56, 0xEB, 0x76]);
    expect(cpu.DE).toBe(0x5678);
    expect(cpu.HL).toBe(0x1234);
  });
});

describe('LDIR', () => {
  it('copies BC bytes from (HL) to (DE)', () => {
    const { cpu, mem } = makeZ80();
    mem[0x1000] = 0xAA; mem[0x1001] = 0xBB; mem[0x1002] = 0xCC;
    // LD HL,0x1000; LD DE,0x2000; LD BC,3; LDIR; HALT
    [0x21,0x00,0x10, 0x11,0x00,0x20, 0x01,0x03,0x00, 0xED,0xB0, 0x76]
      .forEach((b,i)=>{ mem[i]=b; });
    while (!cpu.halted) cpu.step();
    expect(mem[0x2000]).toBe(0xAA);
    expect(mem[0x2001]).toBe(0xBB);
    expect(mem[0x2002]).toBe(0xCC);
    expect(cpu.BC).toBe(0);
  });
});

describe('Rotate / shift (CB prefix)', () => {
  it('RLC A rotates left, MSB into carry', () => {
    const cpu = loadAndRun([0x3E,0x80, 0xCB,0x07, 0x76]); // LD A,0x80; RLC A
    expect(cpu.A).toBe(0x01);
    expect(cpu.fC).toBe(1);
  });

  it('SRL A shifts right, LSB into carry', () => {
    const cpu = loadAndRun([0x3E,0x01, 0xCB,0x3F, 0x76]); // SRL A
    expect(cpu.A).toBe(0x00);
    expect(cpu.fC).toBe(1);
    expect(cpu.fZ).toBe(1);
  });
});

describe('BIT / SET / RES (CB prefix)', () => {
  it('BIT sets Z flag when bit is 0', () => {
    const cpu = loadAndRun([0x3E,0x00, 0xCB,0x47, 0x76]); // BIT 0,A on A=0
    expect(cpu.fZ).toBe(1);
  });

  it('SET sets a bit in a register', () => {
    const cpu = loadAndRun([0x3E,0x00, 0xCB,0xC7, 0x76]); // SET 0,A
    expect(cpu.A).toBe(1);
  });

  it('RES clears a bit in a register', () => {
    const cpu = loadAndRun([0x3E,0xFF, 0xCB,0x87, 0x76]); // RES 0,A
    expect(cpu.A).toBe(0xFE);
  });
});

describe('IX / IY (DD / FD prefix)', () => {
  it('LD IX,nn loads IX', () => {
    const cpu = loadAndRun([0xDD,0x21,0x34,0x12, 0x76]); // LD IX,0x1234
    expect(cpu.IX).toBe(0x1234);
  });

  it('LD A,(IX+d) reads from memory at IX+d', () => {
    const { cpu, mem } = makeZ80();
    mem[0x1005] = 0x77;
    [0xDD,0x21,0x00,0x10, 0xDD,0x7E,0x05, 0x76].forEach((b,i)=>{ mem[i]=b; });
    while (!cpu.halted) cpu.step();
    expect(cpu.A).toBe(0x77);
  });
});

describe('16-bit ADD HL', () => {
  it('ADD HL,BC adds BC to HL', () => {
    const cpu = loadAndRun([0x21,0x00,0x01, 0x01,0x00,0x01, 0x09, 0x76]); // HL=0x100, BC=0x100
    expect(cpu.HL).toBe(0x200);
  });
});
