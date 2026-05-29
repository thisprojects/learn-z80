import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RegisterPanel, snapshotCPU, type RegSnapshot } from './RegisterPanel';
import { Z80 } from '../lib/z80';

function makeRegs(overrides: Partial<RegSnapshot> = {}): RegSnapshot {
  return {
    A: '0x00', F: '0x00', B: '0x00', C: '0x00',
    D: '0x00', E: '0x00', H: '0x00', L: '0x00',
    AF: '0x0000', BC: '0x0000', DE: '0x0000', HL: '0x0000',
    IX: '0x0000', IY: '0x0000', SP: '0xFFFF', PC: '0x0000',
    fS: 0, fZ: 0, fH: 0, fPV: 0, fN: 0, fC: 0,
    cycles: 0,
    ...overrides,
  };
}

describe('RegisterPanel', () => {
  it('renders section headers', () => {
    render(<RegisterPanel regs={makeRegs()} prevRegs={null} />);
    expect(screen.getByText('MAIN')).toBeInTheDocument();
    expect(screen.getByText('PAIRS')).toBeInTheDocument();
    expect(screen.getByText('INDEX')).toBeInTheDocument();
    expect(screen.getByText('FLAGS')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  it('renders all register names', () => {
    render(<RegisterPanel regs={makeRegs()} prevRegs={null} />);
    // Unambiguous names — appear exactly once
    for (const name of ['A', 'F', 'B', 'D', 'E', 'L', 'AF', 'BC', 'DE', 'HL', 'IX', 'IY', 'SP', 'PC']) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    // C appears as both register label and flag label; H appears as register and flag
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('H').length).toBeGreaterThanOrEqual(2);
  });

  it('renders register values', () => {
    render(<RegisterPanel regs={makeRegs({ A: '0x42' })} prevRegs={null} />);
    expect(screen.getByText('0x42')).toBeInTheDocument();
  });

  it('renders all flag labels', () => {
    render(<RegisterPanel regs={makeRegs()} prevRegs={null} />);
    for (const flag of ['S', 'Z', 'PV', 'N']) {
      expect(screen.getByText(flag)).toBeInTheDocument();
    }
    // H and C each appear as both a register label and a flag label
    expect(screen.getAllByText('H').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(2);
  });

  it('renders cycle count', () => {
    render(<RegisterPanel regs={makeRegs({ cycles: 42 })} prevRegs={null} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('marks changed registers with amber styling when prevRegs differs', () => {
    const prev = makeRegs({ A: '0x00' });
    const curr = makeRegs({ A: '0x42' });
    const { container } = render(<RegisterPanel regs={curr} prevRegs={prev} />);
    const changed = container.querySelector('.text-\\[\\#ffb000\\]');
    expect(changed).toBeInTheDocument();
  });

  it('does not mark registers changed when prevRegs is null', () => {
    const { container } = render(<RegisterPanel regs={makeRegs()} prevRegs={null} />);
    expect(container.querySelector('.text-\\[\\#ffb000\\]')).not.toBeInTheDocument();
  });
});

describe('snapshotCPU', () => {
  it('returns hex-formatted register values from a Z80 instance', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0x42;
    cpu.BC = 0x1234;
    cpu.IX = 0xABCD;
    cpu.SP = 0xFFFF;
    const snap = snapshotCPU(cpu);
    expect(snap.A).toBe('0x42');
    expect(snap.BC).toBe('0x1234');
    expect(snap.IX).toBe('0xABCD');
    expect(snap.SP).toBe('0xFFFF');
    expect(snap.cycles).toBe(0);
  });

  it('includes flag values from the CPU', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.setF(1, 1, 0, 0, 0, 1); // S=1, Z=1, C=1
    const snap = snapshotCPU(cpu);
    expect(snap.fS).toBe(1);
    expect(snap.fZ).toBe(1);
    expect(snap.fC).toBe(1);
    expect(snap.fH).toBe(0);
  });

  it('snapshot renders correctly in RegisterPanel', () => {
    const mem = new Uint8Array(65536);
    const cpu = new Z80(mem);
    cpu.A = 0xFF;
    const snap = snapshotCPU(cpu);
    render(<RegisterPanel regs={snap} prevRegs={null} />);
    expect(screen.getByText('0xFF')).toBeInTheDocument();
  });
});
