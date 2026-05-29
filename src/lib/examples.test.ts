import { describe, it, expect } from 'vitest';
import { Z80 } from './z80';
import { assemble } from './assembler';
import { runTestSuite } from './testRunner';
import { EXAMPLES } from './examples';

function runExample(name: keyof typeof EXAMPLES) {
  const ex = EXAMPLES[name];
  const result = assemble(ex.code);
  expect(result.errors, `${name} assembled with errors: ${result.errors.join(', ')}`).toHaveLength(0);

  const mem = new Uint8Array(65536);
  result.bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });
  const cpu = new Z80(mem);
  let steps = 0;
  while (!cpu.halted && steps < 100_000) { cpu.step(); steps++; }

  return runTestSuite(cpu, ex.tests);
}

describe('example: loop', () => {
  it('all assertions pass', () => {
    const results = runExample('loop');
    const failures = results.filter(r => !r.pass);
    expect(failures, failures.map(f => f.name).join(', ')).toHaveLength(0);
  });

  it('A equals 55 (sum of 1..10)', () => {
    const results = runExample('loop');
    const aResult = results.find(r => r.name.startsWith('A'));
    expect(aResult?.pass).toBe(true);
    expect(aResult?.actual).toBe(55);
  });
});

describe('example: hello', () => {
  it('all assertions pass', () => {
    const results = runExample('hello');
    const failures = results.filter(r => !r.pass);
    expect(failures, failures.map(f => f.name).join(', ')).toHaveLength(0);
  });

  it('copies Hello to 0x8000', () => {
    const ex = EXAMPLES.hello;
    const result = assemble(ex.code);
    const mem = new Uint8Array(65536);
    result.bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();

    expect(mem[0x8000]).toBe(0x48); // H
    expect(mem[0x8001]).toBe(0x65); // e
    expect(mem[0x8002]).toBe(0x6C); // l
    expect(mem[0x8003]).toBe(0x6C); // l
    expect(mem[0x8004]).toBe(0x6F); // o
  });
});

describe('example: fibonacci', () => {
  it('all assertions pass', () => {
    const results = runExample('fibonacci');
    const failures = results.filter(r => !r.pass);
    expect(failures, failures.map(f => f.name).join(', ')).toHaveLength(0);
  });

  it('produces correct Fibonacci sequence at 0x8000', () => {
    const ex = EXAMPLES.fibonacci;
    const result = assemble(ex.code);
    const mem = new Uint8Array(65536);
    result.bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();

    const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
    expected.forEach((v, i) => {
      expect(mem[0x8000 + i], `fib[${i}]`).toBe(v);
    });
  });
});

describe('example: sort', () => {
  it('all assertions pass', () => {
    const results = runExample('sort');
    const failures = results.filter(r => !r.pass);
    expect(failures, failures.map(f => f.name).join(', ')).toHaveLength(0);
  });

  it('sorts 8 bytes into ascending order', () => {
    const ex = EXAMPLES.sort;
    const result = assemble(ex.code);
    const mem = new Uint8Array(65536);
    result.bytes.forEach((b, i) => { if (b !== undefined) mem[i] = b; });
    const cpu = new Z80(mem);
    while (!cpu.halted) cpu.step();

    expect([...mem.slice(0x8000, 0x8008)]).toEqual([1, 2, 3, 4, 5, 7, 8, 9]);
  });
});
