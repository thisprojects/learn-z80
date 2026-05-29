export function parity(v: number): number {
  v ^= v >> 4; v ^= v >> 2; v ^= v >> 1; return (~v) & 1;
}

export class Z80 {
  mem: Uint8Array;
  A = 0; F = 0;
  B = 0; C = 0;
  D = 0; E = 0;
  H = 0; L = 0;
  A2 = 0; F2 = 0;
  B2 = 0; C2 = 0;
  D2 = 0; E2 = 0;
  H2 = 0; L2 = 0;
  IX = 0; IY = 0;
  SP = 0xFFFF; PC = 0;
  I = 0; R = 0;
  IFF1 = 0; IFF2 = 0;
  halted = false;
  cycles = 0;

  constructor(mem: Uint8Array) {
    this.mem = mem;
  }

  reset() {
    this.A = 0; this.F = 0;
    this.B = 0; this.C = 0;
    this.D = 0; this.E = 0;
    this.H = 0; this.L = 0;
    this.A2 = 0; this.F2 = 0;
    this.B2 = 0; this.C2 = 0;
    this.D2 = 0; this.E2 = 0;
    this.H2 = 0; this.L2 = 0;
    this.IX = 0; this.IY = 0;
    this.SP = 0xFFFF; this.PC = 0;
    this.I = 0; this.R = 0;
    this.IFF1 = 0; this.IFF2 = 0;
    this.halted = false;
    this.cycles = 0;
  }

  get fS()  { return (this.F >> 7) & 1; }
  get fZ()  { return (this.F >> 6) & 1; }
  get fH()  { return (this.F >> 4) & 1; }
  get fPV() { return (this.F >> 2) & 1; }
  get fN()  { return (this.F >> 1) & 1; }
  get fC()  { return (this.F >> 0) & 1; }

  setF(s: number, z: number, h: number, pv: number, n: number, c: number) {
    this.F = ((s & 1) << 7) | ((z & 1) << 6) | ((h & 1) << 4) | ((pv & 1) << 2) | ((n & 1) << 1) | (c & 1);
  }

  get BC() { return (this.B << 8) | this.C; }
  set BC(v) { this.B = (v >> 8) & 0xFF; this.C = v & 0xFF; }
  get DE() { return (this.D << 8) | this.E; }
  set DE(v) { this.D = (v >> 8) & 0xFF; this.E = v & 0xFF; }
  get HL() { return (this.H << 8) | this.L; }
  set HL(v) { this.H = (v >> 8) & 0xFF; this.L = v & 0xFF; }
  get AF() { return (this.A << 8) | this.F; }
  set AF(v) { this.A = (v >> 8) & 0xFF; this.F = v & 0xFF; }

  rb(addr: number) { return this.mem[addr & 0xFFFF]; }
  wb(addr: number, v: number) { this.mem[addr & 0xFFFF] = v & 0xFF; }
  rw(addr: number) { return this.rb(addr) | (this.rb(addr + 1) << 8); }
  ww(addr: number, v: number) { this.wb(addr, v & 0xFF); this.wb(addr + 1, (v >> 8) & 0xFF); }

  fetch() { const v = this.rb(this.PC); this.PC = (this.PC + 1) & 0xFFFF; return v; }
  fetchW() { const lo = this.fetch(); const hi = this.fetch(); return lo | (hi << 8); }

  push(v: number) { this.SP = (this.SP - 2) & 0xFFFF; this.ww(this.SP, v); }
  pop() { const v = this.rw(this.SP); this.SP = (this.SP + 2) & 0xFFFF; return v; }

  sb(v: number) { return v >= 128 ? v - 256 : v; }

  addA(v: number, carry = 0) {
    const r = this.A + v + carry;
    const h = ((this.A & 0xF) + (v & 0xF) + carry) > 0xF ? 1 : 0;
    const ov = (~(this.A ^ v) & (this.A ^ r) & 0x80) ? 1 : 0;
    this.A = r & 0xFF;
    this.setF((this.A >> 7) & 1, this.A === 0 ? 1 : 0, h, ov, 0, r > 0xFF ? 1 : 0);
  }
  subA(v: number, borrow = 0) {
    const r = this.A - v - borrow;
    const h = ((this.A & 0xF) - (v & 0xF) - borrow) < 0 ? 1 : 0;
    const ov = ((this.A ^ v) & (this.A ^ r) & 0x80) ? 1 : 0;
    this.A = r & 0xFF;
    this.setF((this.A >> 7) & 1, this.A === 0 ? 1 : 0, h, ov, 1, r < 0 ? 1 : 0);
  }
  andA(v: number) { this.A &= v; this.setF((this.A >> 7) & 1, this.A === 0 ? 1 : 0, 1, parity(this.A), 0, 0); }
  orA(v: number)  { this.A |= v; this.setF((this.A >> 7) & 1, this.A === 0 ? 1 : 0, 0, parity(this.A), 0, 0); }
  xorA(v: number) { this.A ^= v; this.setF((this.A >> 7) & 1, this.A === 0 ? 1 : 0, 0, parity(this.A), 0, 0); }
  cpA(v: number) {
    const r = this.A - v;
    const h = ((this.A & 0xF) - (v & 0xF)) < 0 ? 1 : 0;
    const ov = ((this.A ^ v) & (this.A ^ r) & 0x80) ? 1 : 0;
    this.setF((r >> 7) & 1, r === 0 ? 1 : 0, h, ov, 1, r < 0 ? 1 : 0);
  }
  incR(v: number) {
    const r = (v + 1) & 0xFF;
    const h = (v & 0xF) === 0xF ? 1 : 0;
    const ov = v === 0x7F ? 1 : 0;
    this.setF((r >> 7) & 1, r === 0 ? 1 : 0, h, ov, 0, this.fC);
    return r;
  }
  decR(v: number) {
    const r = (v - 1) & 0xFF;
    const h = (v & 0xF) === 0 ? 1 : 0;
    const ov = v === 0x80 ? 1 : 0;
    this.setF((r >> 7) & 1, r === 0 ? 1 : 0, h, ov, 1, this.fC);
    return r;
  }
  rlc(v: number) { const c = (v >> 7) & 1; const r = ((v << 1) | c) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  rrc(v: number) { const c = v & 1; const r = ((v >> 1) | (c << 7)) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  rl(v: number)  { const c = (v >> 7) & 1; const r = ((v << 1) | this.fC) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  rr(v: number)  { const c = v & 1; const r = ((v >> 1) | (this.fC << 7)) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  sla(v: number) { const c = (v >> 7) & 1; const r = (v << 1) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  sra(v: number) { const c = v & 1; const r = ((v >> 1) | (v & 0x80)) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }
  srl(v: number) { const c = v & 1; const r = (v >> 1) & 0xFF; this.setF((r >> 7) & 1, r === 0 ? 1 : 0, 0, parity(r), 0, c); return r; }

  addHL(v: number) {
    const r = this.HL + v;
    this.H = (r >> 8) & 0xFF; this.L = r & 0xFF;
    const fC = r > 0xFFFF ? 1 : 0;
    this.F = (this.F & 0b11110100) | fC | (((this.HL & 0xFFF) < (v & 0xFFF)) ? 0x10 : 0);
  }

  getR(r: number): number {
    switch (r) { case 0: return this.B; case 1: return this.C; case 2: return this.D; case 3: return this.E; case 4: return this.H; case 5: return this.L; case 6: return this.rb(this.HL); case 7: return this.A; }
    return 0;
  }
  setR(r: number, v: number) {
    switch (r) { case 0: this.B = v; break; case 1: this.C = v; break; case 2: this.D = v; break; case 3: this.E = v; break; case 4: this.H = v; break; case 5: this.L = v; break; case 6: this.wb(this.HL, v); break; case 7: this.A = v; break; }
  }

  step() {
    if (this.halted) return;
    const op = this.fetch();
    this.R = (this.R + 1) & 0x7F;

    switch (op) {
      case 0x00: break;
      case 0x76: this.halted = true; break;

      case 0x40: case 0x41: case 0x42: case 0x43: case 0x44: case 0x45: case 0x46: case 0x47:
      case 0x48: case 0x49: case 0x4A: case 0x4B: case 0x4C: case 0x4D: case 0x4E: case 0x4F:
      case 0x50: case 0x51: case 0x52: case 0x53: case 0x54: case 0x55: case 0x56: case 0x57:
      case 0x58: case 0x59: case 0x5A: case 0x5B: case 0x5C: case 0x5D: case 0x5E: case 0x5F:
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67:
      case 0x68: case 0x69: case 0x6A: case 0x6B: case 0x6C: case 0x6D: case 0x6E: case 0x6F:
      case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75:            case 0x77:
      case 0x78: case 0x79: case 0x7A: case 0x7B: case 0x7C: case 0x7D: case 0x7E: case 0x7F:
        this.setR((op >> 3) & 7, this.getR(op & 7)); break;

      case 0x06: this.B = this.fetch(); break;
      case 0x0E: this.C = this.fetch(); break;
      case 0x16: this.D = this.fetch(); break;
      case 0x1E: this.E = this.fetch(); break;
      case 0x26: this.H = this.fetch(); break;
      case 0x2E: this.L = this.fetch(); break;
      case 0x36: this.wb(this.HL, this.fetch()); break;
      case 0x3E: this.A = this.fetch(); break;

      case 0x01: this.BC = this.fetchW(); break;
      case 0x11: this.DE = this.fetchW(); break;
      case 0x21: this.HL = this.fetchW(); break;
      case 0x31: this.SP = this.fetchW(); break;

      case 0x32: this.wb(this.fetchW(), this.A); break;
      case 0x3A: this.A = this.rb(this.fetchW()); break;
      case 0x22: { const a = this.fetchW(); this.ww(a, this.HL); break; }
      case 0x2A: this.HL = this.rw(this.fetchW()); break;

      case 0x02: this.wb(this.BC, this.A); break;
      case 0x12: this.wb(this.DE, this.A); break;
      case 0x0A: this.A = this.rb(this.BC); break;
      case 0x1A: this.A = this.rb(this.DE); break;

      case 0xF9: this.SP = this.HL; break;

      case 0x04: this.B = this.incR(this.B); break; case 0x05: this.B = this.decR(this.B); break;
      case 0x0C: this.C = this.incR(this.C); break; case 0x0D: this.C = this.decR(this.C); break;
      case 0x14: this.D = this.incR(this.D); break; case 0x15: this.D = this.decR(this.D); break;
      case 0x1C: this.E = this.incR(this.E); break; case 0x1D: this.E = this.decR(this.E); break;
      case 0x24: this.H = this.incR(this.H); break; case 0x25: this.H = this.decR(this.H); break;
      case 0x2C: this.L = this.incR(this.L); break; case 0x2D: this.L = this.decR(this.L); break;
      case 0x34: this.wb(this.HL, this.incR(this.rb(this.HL))); break;
      case 0x35: this.wb(this.HL, this.decR(this.rb(this.HL))); break;
      case 0x3C: this.A = this.incR(this.A); break; case 0x3D: this.A = this.decR(this.A); break;

      case 0x03: this.BC = (this.BC + 1) & 0xFFFF; break; case 0x0B: this.BC = (this.BC - 1) & 0xFFFF; break;
      case 0x13: this.DE = (this.DE + 1) & 0xFFFF; break; case 0x1B: this.DE = (this.DE - 1) & 0xFFFF; break;
      case 0x23: this.HL = (this.HL + 1) & 0xFFFF; break; case 0x2B: this.HL = (this.HL - 1) & 0xFFFF; break;
      case 0x33: this.SP = (this.SP + 1) & 0xFFFF; break; case 0x3B: this.SP = (this.SP - 1) & 0xFFFF; break;

      case 0x09: this.addHL(this.BC); break;
      case 0x19: this.addHL(this.DE); break;
      case 0x29: this.addHL(this.HL); break;
      case 0x39: this.addHL(this.SP); break;

      case 0x80: case 0x81: case 0x82: case 0x83: case 0x84: case 0x85: case 0x86: case 0x87:
        this.addA(this.getR(op & 7)); break;
      case 0x88: case 0x89: case 0x8A: case 0x8B: case 0x8C: case 0x8D: case 0x8E: case 0x8F:
        this.addA(this.getR(op & 7), this.fC); break;
      case 0x90: case 0x91: case 0x92: case 0x93: case 0x94: case 0x95: case 0x96: case 0x97:
        this.subA(this.getR(op & 7)); break;
      case 0x98: case 0x99: case 0x9A: case 0x9B: case 0x9C: case 0x9D: case 0x9E: case 0x9F:
        this.subA(this.getR(op & 7), this.fC); break;
      case 0xA0: case 0xA1: case 0xA2: case 0xA3: case 0xA4: case 0xA5: case 0xA6: case 0xA7:
        this.andA(this.getR(op & 7)); break;
      case 0xA8: case 0xA9: case 0xAA: case 0xAB: case 0xAC: case 0xAD: case 0xAE: case 0xAF:
        this.xorA(this.getR(op & 7)); break;
      case 0xB0: case 0xB1: case 0xB2: case 0xB3: case 0xB4: case 0xB5: case 0xB6: case 0xB7:
        this.orA(this.getR(op & 7)); break;
      case 0xB8: case 0xB9: case 0xBA: case 0xBB: case 0xBC: case 0xBD: case 0xBE: case 0xBF:
        this.cpA(this.getR(op & 7)); break;

      case 0xC6: this.addA(this.fetch()); break;
      case 0xCE: this.addA(this.fetch(), this.fC); break;
      case 0xD6: this.subA(this.fetch()); break;
      case 0xDE: this.subA(this.fetch(), this.fC); break;
      case 0xE6: this.andA(this.fetch()); break;
      case 0xEE: this.xorA(this.fetch()); break;
      case 0xF6: this.orA(this.fetch()); break;
      case 0xFE: this.cpA(this.fetch()); break;

      case 0xC3: { const a = this.fetchW(); this.PC = a; break; }
      case 0x18: { const d = this.sb(this.fetch()); this.PC = (this.PC + d) & 0xFFFF; break; }
      case 0x20: { const d = this.sb(this.fetch()); if (!this.fZ) this.PC = (this.PC + d) & 0xFFFF; break; }
      case 0x28: { const d = this.sb(this.fetch()); if (this.fZ) this.PC = (this.PC + d) & 0xFFFF; break; }
      case 0x30: { const d = this.sb(this.fetch()); if (!this.fC) this.PC = (this.PC + d) & 0xFFFF; break; }
      case 0x38: { const d = this.sb(this.fetch()); if (this.fC) this.PC = (this.PC + d) & 0xFFFF; break; }
      case 0x10: { const d = this.sb(this.fetch()); this.B = (this.B - 1) & 0xFF; if (this.B !== 0) this.PC = (this.PC + d) & 0xFFFF; break; }

      case 0xC2: { const a = this.fetchW(); if (!this.fZ) this.PC = a; break; }
      case 0xCA: { const a = this.fetchW(); if (this.fZ) this.PC = a; break; }
      case 0xD2: { const a = this.fetchW(); if (!this.fC) this.PC = a; break; }
      case 0xDA: { const a = this.fetchW(); if (this.fC) this.PC = a; break; }
      case 0xE2: { const a = this.fetchW(); if (!this.fPV) this.PC = a; break; }
      case 0xEA: { const a = this.fetchW(); if (this.fPV) this.PC = a; break; }
      case 0xF2: { const a = this.fetchW(); if (!this.fS) this.PC = a; break; }
      case 0xFA: { const a = this.fetchW(); if (this.fS) this.PC = a; break; }

      case 0xE9: this.PC = this.HL; break;

      case 0xCD: { const a = this.fetchW(); this.push(this.PC); this.PC = a; break; }
      case 0xC9: this.PC = this.pop(); break;
      case 0xC4: { const a = this.fetchW(); if (!this.fZ) { this.push(this.PC); this.PC = a; } break; }
      case 0xCC: { const a = this.fetchW(); if (this.fZ) { this.push(this.PC); this.PC = a; } break; }
      case 0xD4: { const a = this.fetchW(); if (!this.fC) { this.push(this.PC); this.PC = a; } break; }
      case 0xDC: { const a = this.fetchW(); if (this.fC) { this.push(this.PC); this.PC = a; } break; }
      case 0xC0: if (!this.fZ) this.PC = this.pop(); break;
      case 0xC8: if (this.fZ) this.PC = this.pop(); break;
      case 0xD0: if (!this.fC) this.PC = this.pop(); break;
      case 0xD8: if (this.fC) this.PC = this.pop(); break;
      case 0xE0: if (!this.fPV) this.PC = this.pop(); break;
      case 0xE8: if (this.fPV) this.PC = this.pop(); break;
      case 0xF0: if (!this.fS) this.PC = this.pop(); break;
      case 0xF8: if (this.fS) this.PC = this.pop(); break;

      case 0xC7: case 0xCF: case 0xD7: case 0xDF: case 0xE7: case 0xEF: case 0xF7: case 0xFF:
        this.push(this.PC); this.PC = (op & 0x38); break;

      case 0xC5: this.push(this.BC); break; case 0xC1: this.BC = this.pop(); break;
      case 0xD5: this.push(this.DE); break; case 0xD1: this.DE = this.pop(); break;
      case 0xE5: this.push(this.HL); break; case 0xE1: this.HL = this.pop(); break;
      case 0xF5: this.push(this.AF); break; case 0xF1: this.AF = this.pop(); break;

      case 0xEB: { const t = this.DE; this.DE = this.HL; this.HL = t; break; }
      case 0x08: { const ta = this.A, tf = this.F; this.A = this.A2; this.F = this.F2; this.A2 = ta; this.F2 = tf; break; }
      case 0xD9: {
        let t;
        t = this.B; this.B = this.B2; this.B2 = t;
        t = this.C; this.C = this.C2; this.C2 = t;
        t = this.D; this.D = this.D2; this.D2 = t;
        t = this.E; this.E = this.E2; this.E2 = t;
        t = this.H; this.H = this.H2; this.H2 = t;
        t = this.L; this.L = this.L2; this.L2 = t;
        break;
      }
      case 0xE3: { const lo = this.rb(this.SP), hi = this.rb(this.SP + 1); this.wb(this.SP, this.L); this.wb(this.SP + 1, this.H); this.H = hi; this.L = lo; break; }

      case 0x07: { const c = (this.A >> 7) & 1; this.A = ((this.A << 1) | c) & 0xFF; this.F = (this.F & 0xC4) | c; break; }
      case 0x0F: { const c = this.A & 1; this.A = ((this.A >> 1) | (c << 7)) & 0xFF; this.F = (this.F & 0xC4) | c; break; }
      case 0x17: { const c = (this.A >> 7) & 1; this.A = ((this.A << 1) | this.fC) & 0xFF; this.F = (this.F & 0xC4) | c; break; }
      case 0x1F: { const c = this.A & 1; this.A = ((this.A >> 1) | (this.fC << 7)) & 0xFF; this.F = (this.F & 0xC4) | c; break; }

      case 0x27: {
        let a = this.A, c = this.fC, h = this.fH, n = this.fN;
        if (!n) { if (h || (a & 0xF) > 9) a += 6; if (c || a > 0x99) { a += 0x60; c = 1; } }
        else { if (h) a = (a - 6) & 0xFF; if (c) a = (a - 0x60) & 0xFF; }
        this.F = (this.F & 0x02) | ((a & 0x80) ? 0x80 : 0) | ((a & 0xFF) ? 0 : 0x40) | parity(a & 0xFF) << 2 | c;
        this.A = a & 0xFF; break;
      }
      case 0x2F: this.A ^= 0xFF; this.F |= 0x12; break;
      case 0x3F: { const c = this.fC; this.F = (this.F & 0xC4) | ((c ^ 1) & 1) | (c << 4); break; }
      case 0x37: this.F = (this.F & 0xC4) | 1; break;

      case 0xCB: this.execCB(); break;
      case 0xDD: this.execDD(); break;
      case 0xFD: this.execFD(); break;
      case 0xED: this.execED(); break;

      case 0xDB: this.fetch(); break;
      case 0xD3: this.fetch(); break;

      default: break;
    }
    this.cycles++;
  }

  execCB() {
    const op = this.fetch();
    const r = op & 7;
    const bit = (op >> 3) & 7;
    switch ((op >> 6) & 3) {
      case 0: {
        const fns = [
          (v: number) => this.rlc(v), (v: number) => this.rrc(v),
          (v: number) => this.rl(v),  (v: number) => this.rr(v),
          (v: number) => this.sla(v), (v: number) => this.sra(v),
          (v: number) => { const c = (v >> 7) & 1; const res = ((v << 1) | 1) & 0xFF; this.setF((res >> 7) & 1, res === 0 ? 1 : 0, 0, parity(res), 0, c); return res; },
          (v: number) => this.srl(v),
        ];
        this.setR(r, fns[bit](this.getR(r))); break;
      }
      case 1: {
        const v = this.getR(r) & (1 << bit);
        this.F = (this.F & 0x01) | 0x10 | (v ? 0 : 0x44) | (v & 0x80); break;
      }
      case 2: this.setR(r, this.getR(r) & ~(1 << bit)); break;
      case 3: this.setR(r, this.getR(r) | (1 << bit)); break;
    }
  }

  execDD() {
    const op = this.fetch();
    switch (op) {
      case 0x21: this.IX = this.fetchW(); break;
      case 0x22: this.ww(this.fetchW(), this.IX); break;
      case 0x2A: this.IX = this.rw(this.fetchW()); break;
      case 0x36: { const d = this.sb(this.fetch()); const n = this.fetch(); this.wb((this.IX + d) & 0xFFFF, n); break; }
      case 0x46: { const d = this.sb(this.fetch()); this.B = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x4E: { const d = this.sb(this.fetch()); this.C = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x56: { const d = this.sb(this.fetch()); this.D = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x5E: { const d = this.sb(this.fetch()); this.E = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x66: { const d = this.sb(this.fetch()); this.H = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x6E: { const d = this.sb(this.fetch()); this.L = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x7E: { const d = this.sb(this.fetch()); this.A = this.rb((this.IX + d) & 0xFFFF); break; }
      case 0x70: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.B); break; }
      case 0x71: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.C); break; }
      case 0x72: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.D); break; }
      case 0x73: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.E); break; }
      case 0x74: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.H); break; }
      case 0x75: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.L); break; }
      case 0x77: { const d = this.sb(this.fetch()); this.wb((this.IX + d) & 0xFFFF, this.A); break; }
      case 0x86: { const d = this.sb(this.fetch()); this.addA(this.rb((this.IX + d) & 0xFFFF)); break; }
      case 0x96: { const d = this.sb(this.fetch()); this.subA(this.rb((this.IX + d) & 0xFFFF)); break; }
      case 0xBE: { const d = this.sb(this.fetch()); this.cpA(this.rb((this.IX + d) & 0xFFFF)); break; }
      case 0x23: this.IX = (this.IX + 1) & 0xFFFF; break;
      case 0x2B: this.IX = (this.IX - 1) & 0xFFFF; break;
      case 0xE5: this.push(this.IX); break;
      case 0xE1: this.IX = this.pop(); break;
      case 0xE9: this.PC = this.IX; break;
      case 0xF9: this.SP = this.IX; break;
      default: break;
    }
  }

  execFD() {
    const op = this.fetch();
    switch (op) {
      case 0x21: this.IY = this.fetchW(); break;
      case 0x22: this.ww(this.fetchW(), this.IY); break;
      case 0x2A: this.IY = this.rw(this.fetchW()); break;
      case 0x36: { const d = this.sb(this.fetch()); const n = this.fetch(); this.wb((this.IY + d) & 0xFFFF, n); break; }
      case 0x46: { const d = this.sb(this.fetch()); this.B = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x4E: { const d = this.sb(this.fetch()); this.C = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x56: { const d = this.sb(this.fetch()); this.D = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x5E: { const d = this.sb(this.fetch()); this.E = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x66: { const d = this.sb(this.fetch()); this.H = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x6E: { const d = this.sb(this.fetch()); this.L = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x7E: { const d = this.sb(this.fetch()); this.A = this.rb((this.IY + d) & 0xFFFF); break; }
      case 0x70: { const d = this.sb(this.fetch()); this.wb((this.IY + d) & 0xFFFF, this.B); break; }
      case 0x77: { const d = this.sb(this.fetch()); this.wb((this.IY + d) & 0xFFFF, this.A); break; }
      case 0x86: { const d = this.sb(this.fetch()); this.addA(this.rb((this.IY + d) & 0xFFFF)); break; }
      case 0x96: { const d = this.sb(this.fetch()); this.subA(this.rb((this.IY + d) & 0xFFFF)); break; }
      case 0xBE: { const d = this.sb(this.fetch()); this.cpA(this.rb((this.IY + d) & 0xFFFF)); break; }
      case 0x23: this.IY = (this.IY + 1) & 0xFFFF; break;
      case 0x2B: this.IY = (this.IY - 1) & 0xFFFF; break;
      case 0xE5: this.push(this.IY); break;
      case 0xE1: this.IY = this.pop(); break;
      case 0xE9: this.PC = this.IY; break;
      default: break;
    }
  }

  execED() {
    const op = this.fetch();
    switch (op) {
      case 0x57: this.A = this.I; break;
      case 0x5F: this.A = this.R; break;
      case 0x47: this.I = this.A; break;
      case 0x4F: this.R = this.A; break;
      case 0x43: this.ww(this.fetchW(), this.BC); break;
      case 0x53: this.ww(this.fetchW(), this.DE); break;
      case 0x63: this.ww(this.fetchW(), this.HL); break;
      case 0x73: this.ww(this.fetchW(), this.SP); break;
      case 0x4B: this.BC = this.rw(this.fetchW()); break;
      case 0x5B: this.DE = this.rw(this.fetchW()); break;
      case 0x6B: this.HL = this.rw(this.fetchW()); break;
      case 0x7B: this.SP = this.rw(this.fetchW()); break;
      case 0xA0: {
        this.wb(this.DE, this.rb(this.HL));
        this.DE = (this.DE + 1) & 0xFFFF; this.HL = (this.HL + 1) & 0xFFFF;
        this.BC = (this.BC - 1) & 0xFFFF;
        this.F = (this.F & 0xC1) | (this.BC ? 0x04 : 0); break;
      }
      case 0xA8: {
        this.wb(this.DE, this.rb(this.HL));
        this.DE = (this.DE - 1) & 0xFFFF; this.HL = (this.HL - 1) & 0xFFFF;
        this.BC = (this.BC - 1) & 0xFFFF;
        this.F = (this.F & 0xC1) | (this.BC ? 0x04 : 0); break;
      }
      case 0xB0: {
        do {
          this.wb(this.DE, this.rb(this.HL));
          this.DE = (this.DE + 1) & 0xFFFF; this.HL = (this.HL + 1) & 0xFFFF;
          this.BC = (this.BC - 1) & 0xFFFF; this.cycles++;
        } while (this.BC !== 0);
        this.F &= 0xC1; break;
      }
      case 0xB8: {
        do {
          this.wb(this.DE, this.rb(this.HL));
          this.DE = (this.DE - 1) & 0xFFFF; this.HL = (this.HL - 1) & 0xFFFF;
          this.BC = (this.BC - 1) & 0xFFFF; this.cycles++;
        } while (this.BC !== 0);
        this.F &= 0xC1; break;
      }
      case 0x44: { const a = this.A; this.A = 0; this.subA(a); break; }
      case 0x45: case 0x4D: this.PC = this.pop(); break;
      case 0xA1: {
        const v = this.rb(this.HL); const r = this.A - v;
        this.HL = (this.HL + 1) & 0xFFFF; this.BC = (this.BC - 1) & 0xFFFF;
        this.F = (this.F & 0x01) | ((r & 0x80) ? 0x80 : 0) | (r === 0 ? 0x40 : 0) | 0x02 | (this.BC ? 0x04 : 0) | ((this.A & 0xF) < (v & 0xF) ? 0x10 : 0);
        break;
      }
      case 0xB1: {
        let r = 0;
        do {
          const v = this.rb(this.HL); r = this.A - v;
          this.HL = (this.HL + 1) & 0xFFFF; this.BC = (this.BC - 1) & 0xFFFF; this.cycles++;
        } while (this.BC !== 0 && r !== 0);
        this.F = (this.F & 0x01) | ((r & 0x80) ? 0x80 : 0) | (r === 0 ? 0x40 : 0) | 0x02 | (this.BC ? 0x04 : 0);
        break;
      }
      case 0x40: this.B = 0; break; case 0x48: this.C = 0; break;
      case 0x50: this.D = 0; break; case 0x58: this.E = 0; break;
      case 0x60: this.H = 0; break; case 0x68: this.L = 0; break;
      case 0x78: this.A = 0; break;
      default: break;
    }
  }
}
