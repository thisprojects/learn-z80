export interface AssembleResult {
  bytes: (number | undefined)[];
  labels: Record<string, number>;
  errors: string[];
  size: number;
}

export function assemble(src: string): AssembleResult {
  const lines = src.split('\n');
  const labels: Record<string, number> = {};
  const output: (number | undefined)[] = [];
  const errors: string[] = [];
  let addr = 0;

  for (let pass = 0; pass < 2; pass++) {
    addr = 0;
    output.length = 0;

    for (let ln = 0; ln < lines.length; ln++) {
      let line = lines[ln];
      const ci = line.indexOf(';');
      if (ci >= 0) line = line.substring(0, ci);
      line = line.trim();
      if (!line) continue;

      const labelMatch = line.match(/^(\w+):/);
      if (labelMatch) {
        if (pass === 0) labels[labelMatch[1].toUpperCase()] = addr;
        line = line.substring(labelMatch[0].length).trim();
        if (!line) continue;
      }

      if (/^ORG\s+/i.test(line)) {
        addr = parseNum(line.replace(/^ORG\s+/i, '').trim());
        continue;
      }
      if (/^DB\s+/i.test(line)) {
        const args = splitDbArgs(line.replace(/^DB\s+/i, ''));
        for (const a of args) {
          if (a.startsWith('"') || a.startsWith("'")) {
            const str = a.slice(1, -1);
            for (let i = 0; i < str.length; i++) { output[addr++] = str.charCodeAt(i); }
          } else {
            output[addr++] = parseNum(a) & 0xFF;
          }
        }
        continue;
      }
      if (/^DW\s+/i.test(line)) {
        const args = line.replace(/^DW\s+/i, '').split(',').map(s => s.trim());
        for (const a of args) {
          const v = resolveLabel(a, labels, addr, pass);
          output[addr++] = v & 0xFF;
          output[addr++] = (v >> 8) & 0xFF;
        }
        continue;
      }
      if (/^DS\s+/i.test(line)) {
        const n = parseNum(line.replace(/^DS\s+/i, '').trim());
        for (let i = 0; i < n; i++) output[addr++] = 0;
        continue;
      }
      if (/^\w+\s+EQU\s+/i.test(line)) {
        const m = line.match(/^(\w+)\s+EQU\s+(.+)/i);
        if (m && pass === 0) labels[m[1].toUpperCase()] = parseNum(m[2].trim());
        continue;
      }

      try {
        const bytes = asmLine(line, addr, labels, pass);
        for (const b of bytes) output[addr++] = b;
      } catch (e) {
        if (pass === 1) errors.push(`Line ${ln + 1}: ${(e as Error).message} [${line}]`);
        addr++;
      }
    }
  }
  return { bytes: output, labels, errors, size: addr };
}

function resolveLabel(s: string, labels: Record<string, number>, addr: number, pass: number): number {
  s = s.trim().toUpperCase();
  if (labels[s] !== undefined) return labels[s];
  if (pass === 0) return 0;
  const n = parseNum(s);
  if (!isNaN(n)) return n;
  throw new Error(`Unknown label: ${s}`);
}

export function parseNum(s: string): number {
  s = s.trim();
  if (!s) return 0;
  if (s.startsWith('0x') || s.startsWith('0X')) return parseInt(s, 16);
  if (s.endsWith('H') || s.endsWith('h')) return parseInt(s.slice(0, -1), 16);
  if (s.endsWith('B') || s.endsWith('b')) return parseInt(s.slice(0, -1), 2);
  if (s.startsWith('%')) return parseInt(s.slice(1), 2);
  if (s.startsWith('$')) {
    if (s.length === 1) return 0;
    return parseInt(s.slice(1), 16);
  }
  const n = parseInt(s, 10);
  if (isNaN(n)) return 0;
  return n;
}

const REGS8: Record<string, number>  = { A: 7, B: 0, C: 1, D: 2, E: 3, H: 4, L: 5 };
const REGS16: Record<string, number> = { BC: 0, DE: 1, HL: 2, SP: 3 };

function asmLine(line: string, addr: number, labels: Record<string, number>, pass: number): number[] {
  const tokens = line.toUpperCase().replace(/,/g, ' , ').replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const mnem = tokens[0];

  const getN8 = (s: string) => {
    if (s in labels) return labels[s] & 0xFF;
    return parseNum(s) & 0xFF;
  };
  const getN16 = (s: string) => {
    if (s.toUpperCase() in labels) return labels[s.toUpperCase()] & 0xFFFF;
    if (s === '$') return addr;
    return parseNum(s) & 0xFFFF;
  };
  const getLabel = (s: string) => {
    const u = s.toUpperCase();
    if (pass === 0) return 0;
    if (u in labels) return labels[u];
    return parseNum(s);
  };
  const rel = (s: string) => {
    const target = getLabel(s);
    const off = target - (addr + 2);
    if (off < -128 || off > 127) throw new Error(`Relative jump out of range: ${off}`);
    return off & 0xFF;
  };

  const raw = line.trim().substring(mnem.length).trim();
  const ops = splitOps(raw);

  switch (mnem) {
    case 'NOP': return [0x00];
    case 'HALT': return [0x76];
    case 'SCF': return [0x37];
    case 'CCF': return [0x3F];
    case 'CPL': return [0x2F];
    case 'DAA': return [0x27];
    case 'EI': return [0xFB];
    case 'DI': return [0xF3];
    case 'RLCA': return [0x07];
    case 'RRCA': return [0x0F];
    case 'RLA': return [0x17];
    case 'RRA': return [0x1F];
    case 'EXX': return [0xD9];
    case 'RETI': return [0xED, 0x4D];
    case 'RETN': return [0xED, 0x45];
    case 'NEG': return [0xED, 0x44];
    case 'LDIR': return [0xED, 0xB0];
    case 'LDDR': return [0xED, 0xB8];
    case 'LDI': return [0xED, 0xA0];
    case 'LDD': return [0xED, 0xA8];
    case 'CPI': return [0xED, 0xA1];
    case 'CPIR': return [0xED, 0xB1];

    case 'LD': return asmLD(ops, addr, labels, pass, getN8, getN16, getLabel);
    case 'PUSH': {
      const r = ops[0].toUpperCase();
      const m: Record<string, number | number[]> = { BC: 0xC5, DE: 0xD5, HL: 0xE5, AF: 0xF5, IX: [0xDD, 0xE5], IY: [0xFD, 0xE5] };
      if (!m[r]) throw new Error('Bad PUSH');
      return Array.isArray(m[r]) ? m[r] as number[] : [m[r] as number];
    }
    case 'POP': {
      const r = ops[0].toUpperCase();
      const m: Record<string, number | number[]> = { BC: 0xC1, DE: 0xD1, HL: 0xE1, AF: 0xF1, IX: [0xDD, 0xE1], IY: [0xFD, 0xE1] };
      if (!m[r]) throw new Error('Bad POP');
      return Array.isArray(m[r]) ? m[r] as number[] : [m[r] as number];
    }
    case 'EX': {
      const a = ops[0].toUpperCase(), b = ops[1].toUpperCase();
      if (a === 'DE' && b === 'HL') return [0xEB];
      if (a === 'AF' && b === "AF'") return [0x08];
      if (a === '(SP)' && b === 'HL') return [0xE3];
      if (a === '(SP)' && b === 'IX') return [0xDD, 0xE3];
      if (a === '(SP)' && b === 'IY') return [0xFD, 0xE3];
      throw new Error('Bad EX');
    }

    case 'ADD': return asmALU('ADD', ops, addr, labels, pass, getN8, getN16);
    case 'ADC': return asmALU('ADC', ops, addr, labels, pass, getN8, getN16);
    case 'SUB': return asmALU('SUB', ops, addr, labels, pass, getN8, getN16);
    case 'SBC': return asmALU('SBC', ops, addr, labels, pass, getN8, getN16);
    case 'AND': return asmALU('AND', ops, addr, labels, pass, getN8, getN16);
    case 'XOR': return asmALU('XOR', ops, addr, labels, pass, getN8, getN16);
    case 'OR':  return asmALU('OR',  ops, addr, labels, pass, getN8, getN16);
    case 'CP':  return asmALU('CP',  ops, addr, labels, pass, getN8, getN16);

    case 'INC': return asmINCDEC('INC', ops);
    case 'DEC': return asmINCDEC('DEC', ops);

    case 'JP': return asmJP(ops, addr, labels, pass, getN16);
    case 'JR': return asmJR(ops, addr, labels, pass, rel);
    case 'DJNZ': return [0x10, rel(ops[0])];
    case 'CALL': return asmCALL(ops, addr, labels, pass, getN16);
    case 'RET': return asmRET(ops);
    case 'RST': { const v = getN8(ops[0]) & 0x38; return [0xC7 | v]; }

    case 'RLC': case 'RRC': case 'RL': case 'RR': case 'SLA': case 'SRA': case 'SRL':
    case 'BIT': case 'SET': case 'RES':
      return asmBitOp(mnem, ops, getN8);

    case 'IN': {
      const a = ops[0].toUpperCase(), b = ops[1].toUpperCase();
      if (a === 'A') return [0xDB, getN8(b.replace(/[()]/g, ''))];
      const r = REGS8[a]; if (r === undefined) throw new Error('Bad IN');
      return [0xED, 0x40 | (r << 3)];
    }
    case 'OUT': {
      const a = ops[0].toUpperCase(), b = ops[1].toUpperCase();
      if (b === 'A') return [0xD3, getN8(a.replace(/[()]/g, ''))];
      return [0xED, 0x41];
    }
    default: throw new Error(`Unknown mnemonic: ${mnem}`);
  }
}

function splitDbArgs(raw: string): string[] {
  const args: string[] = [];
  let cur = '';
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      cur += ch; i++;
      while (i < raw.length && raw[i] !== quote) cur += raw[i++];
      if (i < raw.length) { cur += raw[i++]; }
    } else if (ch === ',') {
      args.push(cur.trim()); cur = ''; i++;
    } else {
      cur += ch; i++;
    }
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function splitOps(raw: string): string[] {
  const ops: string[] = [];
  let depth = 0, cur = '';
  for (const ch of raw) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { ops.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) ops.push(cur.trim());
  return ops;
}

function asmLD(
  ops: string[], addr: number, labels: Record<string, number>, pass: number,
  getN8: (s: string) => number, getN16: (s: string) => number, _getLabel: (s: string) => number
): number[] {
  const dst = ops[0].toUpperCase().trim();
  const src = ops[1].toUpperCase().trim();

  if (dst in REGS8 && src in REGS8) return [0x40 | (REGS8[dst] << 3) | REGS8[src]];
  if (dst in REGS8 && !/\(/.test(src)) {
    const bases: Record<string, number> = { A: 0x3E, B: 0x06, C: 0x0E, D: 0x16, E: 0x1E, H: 0x26, L: 0x2E };
    const n = (src in labels) ? labels[src] : parseNum(src);
    return [bases[dst], n & 0xFF];
  }
  if (dst === '(HL)' && src in REGS8) return [0x70 | REGS8[src]];
  if (dst === '(HL)') return [0x36, getN8(src)];
  if (src === '(HL)' && dst in REGS8) return [0x46 | (REGS8[dst] << 3)];

  if (dst === 'A' && src === '(BC)') return [0x0A];
  if (dst === 'A' && src === '(DE)') return [0x1A];
  if (dst === '(BC)' && src === 'A') return [0x02];
  if (dst === '(DE)' && src === 'A') return [0x12];

  // LD rr,nn — only when src is a plain immediate (not a parenthesised address or register name)
  if (dst in REGS16 && !/^\(/.test(src) && src !== 'HL' && src !== 'IX' && src !== 'IY') {
    const b = [0x01, 0x11, 0x21, 0x31]; const v = getN16(src);
    return [b[REGS16[dst]], v & 0xFF, (v >> 8) & 0xFF];
  }
  if (dst === 'IX') { const v = getN16(src); return [0xDD, 0x21, v & 0xFF, (v >> 8) & 0xFF]; }
  if (dst === 'IY') { const v = getN16(src); return [0xFD, 0x21, v & 0xFF, (v >> 8) & 0xFF]; }

  if (dst === 'SP' && src === 'HL') return [0xF9];
  if (dst === 'SP' && src === 'IX') return [0xDD, 0xF9];
  if (dst === 'SP' && src === 'IY') return [0xFD, 0xF9];

  if (/^\(\w+\)$/.test(dst) && src === 'A') {
    const inner = dst.slice(1, -1);
    if (inner === 'BC' || inner === 'DE') return dst === '(BC)' ? [0x02] : [0x12];
    const v = getN16(inner); return [0x32, v & 0xFF, (v >> 8) & 0xFF];
  }
  if (dst === 'A' && /^\(\w+\)$/.test(src)) {
    const inner = src.slice(1, -1);
    if (inner === 'BC') return [0x0A];
    if (inner === 'DE') return [0x1A];
    const v = getN16(inner); return [0x3A, v & 0xFF, (v >> 8) & 0xFF];
  }
  if (/^\(\w+\)$/.test(dst) && src === 'HL') {
    const v = getN16(dst.slice(1, -1)); return [0x22, v & 0xFF, (v >> 8) & 0xFF];
  }
  if (dst === 'HL' && /^\(\w+\)$/.test(src)) {
    const v = getN16(src.slice(1, -1)); return [0x2A, v & 0xFF, (v >> 8) & 0xFF];
  }
  if (/^\(\w+\)$/.test(dst) && (src === 'BC' || src === 'DE' || src === 'SP')) {
    const v = getN16(dst.slice(1, -1));
    const m: Record<string, number> = { BC: 0x43, DE: 0x53, SP: 0x73 };
    return [0xED, m[src], v & 0xFF, (v >> 8) & 0xFF];
  }
  if ((dst === 'BC' || dst === 'DE' || dst === 'SP') && /^\(\w+\)$/.test(src)) {
    const v = getN16(src.slice(1, -1));
    const m: Record<string, number> = { BC: 0x4B, DE: 0x5B, SP: 0x7B };
    return [0xED, m[dst], v & 0xFF, (v >> 8) & 0xFF];
  }

  const ixMatch = src.match(/^\(IX([+-]\d+|[+-]0x[0-9A-F]+)?\)$/i);
  const iyMatch = src.match(/^\(IY([+-]\d+|[+-]0x[0-9A-F]+)?\)$/i);
  if (ixMatch && dst in REGS8) {
    const d = (ixMatch[1] ? parseInt(ixMatch[1]) : 0) & 0xFF;
    return [0xDD, 0x46 | (REGS8[dst] << 3), d];
  }
  if (iyMatch && dst in REGS8) {
    const d = (iyMatch[1] ? parseInt(iyMatch[1]) : 0) & 0xFF;
    return [0xFD, 0x46 | (REGS8[dst] << 3), d];
  }
  const dstIX = dst.match(/^\(IX([+-]\d+|[+-]0x[0-9A-F]+)?\)$/i);
  const dstIY = dst.match(/^\(IY([+-]\d+|[+-]0x[0-9A-F]+)?\)$/i);
  if (dstIX && src in REGS8) { const d = (dstIX[1] ? parseInt(dstIX[1]) : 0) & 0xFF; return [0xDD, 0x70 | REGS8[src], d]; }
  if (dstIY && src in REGS8) { const d = (dstIY[1] ? parseInt(dstIY[1]) : 0) & 0xFF; return [0xFD, 0x70 | REGS8[src], d]; }

  if (dst === 'A' && src === 'I') return [0xED, 0x57];
  if (dst === 'A' && src === 'R') return [0xED, 0x5F];
  if (dst === 'I' && src === 'A') return [0xED, 0x47];
  if (dst === 'R' && src === 'A') return [0xED, 0x4F];

  throw new Error(`Bad LD: ${ops[0]}, ${ops[1]}`);
}

function asmALU(
  mnem: string, ops: string[], addr: number, labels: Record<string, number>, pass: number,
  getN8: (s: string) => number, _getN16: (s: string) => number
): number[] {
  let dst = ops[0].toUpperCase(), src = (ops[1] || '').toUpperCase();

  if (dst === 'HL' || dst === 'IX' || dst === 'IY') {
    const rr = src || dst;
    if (mnem === 'ADD') {
      if (dst === 'HL') { const m: Record<string, number> = { BC: 0x09, DE: 0x19, HL: 0x29, SP: 0x39 }; if (m[rr]) return [m[rr]]; }
      if (dst === 'IX') { const m: Record<string, number> = { BC: 0x09, DE: 0x19, IX: 0x29, SP: 0x39 }; if (m[rr]) return [0xDD, m[rr]]; }
      if (dst === 'IY') { const m: Record<string, number> = { BC: 0x09, DE: 0x19, IY: 0x29, SP: 0x39 }; if (m[rr]) return [0xFD, m[rr]]; }
    }
    if (mnem === 'ADC' && dst === 'HL') { const m: Record<string, number> = { BC: 0x4A, DE: 0x5A, HL: 0x6A, SP: 0x7A }; if (m[rr]) return [0xED, m[rr]]; }
    if (mnem === 'SBC' && dst === 'HL') { const m: Record<string, number> = { BC: 0x42, DE: 0x52, HL: 0x62, SP: 0x72 }; if (m[rr]) return [0xED, m[rr]]; }
  }

  if (!src && (mnem === 'SUB' || mnem === 'AND' || mnem === 'XOR' || mnem === 'OR' || mnem === 'CP')) {
    src = dst; dst = 'A';
  }

  const mnBases: Record<string, number> = { ADD: 0x80, ADC: 0x88, SUB: 0x90, SBC: 0x98, AND: 0xA0, XOR: 0xA8, OR: 0xB0, CP: 0xB8 };
  const base = mnBases[mnem];
  if (src in REGS8) return [base | REGS8[src]];
  if (src === '(HL)') return [base | 6];

  const immOps: Record<string, number> = { ADD: 0xC6, ADC: 0xCE, SUB: 0xD6, SBC: 0xDE, AND: 0xE6, XOR: 0xEE, OR: 0xF6, CP: 0xFE };
  const n = (src in labels) ? labels[src] : parseNum(src);
  return [immOps[mnem], n & 0xFF];
}

function asmINCDEC(mnem: string, ops: string[]): number[] {
  const r = ops[0].toUpperCase();
  if (r in REGS8) {
    const b: Record<string, number> = { A: mnem === 'INC' ? 0x3C : 0x3D, B: mnem === 'INC' ? 0x04 : 0x05, C: mnem === 'INC' ? 0x0C : 0x0D, D: mnem === 'INC' ? 0x14 : 0x15, E: mnem === 'INC' ? 0x1C : 0x1D, H: mnem === 'INC' ? 0x24 : 0x25, L: mnem === 'INC' ? 0x2C : 0x2D };
    return [b[r]];
  }
  if (r === '(HL)') return [mnem === 'INC' ? 0x34 : 0x35];
  const rr16: Record<string, number[]> = { BC: [0x03, 0x0B], DE: [0x13, 0x1B], HL: [0x23, 0x2B], SP: [0x33, 0x3B] };
  if (r in rr16) return [rr16[r][mnem === 'INC' ? 0 : 1]];
  if (r === 'IX') return [0xDD, mnem === 'INC' ? 0x23 : 0x2B];
  if (r === 'IY') return [0xFD, mnem === 'INC' ? 0x23 : 0x2B];
  throw new Error(`Bad INC/DEC: ${r}`);
}

function asmJP(ops: string[], addr: number, labels: Record<string, number>, pass: number, getN16: (s: string) => number): number[] {
  if (ops.length === 1) {
    const t = ops[0].toUpperCase();
    if (t === '(HL)') return [0xE9];
    if (t === '(IX)') return [0xDD, 0xE9];
    if (t === '(IY)') return [0xFD, 0xE9];
    const v = getN16(ops[0]); return [0xC3, v & 0xFF, (v >> 8) & 0xFF];
  }
  const cc = ops[0].toUpperCase();
  const v = getN16(ops[1]);
  const ccOps: Record<string, number> = { NZ: 0xC2, Z: 0xCA, NC: 0xD2, C: 0xDA, PO: 0xE2, PE: 0xEA, P: 0xF2, M: 0xFA };
  if (cc in ccOps) return [ccOps[cc], v & 0xFF, (v >> 8) & 0xFF];
  const v2 = getN16(ops[0]); return [0xC3, v2 & 0xFF, (v2 >> 8) & 0xFF];
}

function asmJR(ops: string[], addr: number, labels: Record<string, number>, pass: number, rel: (s: string) => number): number[] {
  if (ops.length === 1) return [0x18, rel(ops[0])];
  const cc = ops[0].toUpperCase();
  const ccOps: Record<string, number> = { NZ: 0x20, Z: 0x28, NC: 0x30, C: 0x38 };
  if (cc in ccOps) return [ccOps[cc], rel(ops[1])];
  throw new Error(`Bad JR condition: ${cc}`);
}

function asmCALL(ops: string[], addr: number, labels: Record<string, number>, pass: number, getN16: (s: string) => number): number[] {
  if (ops.length === 1) { const v = getN16(ops[0]); return [0xCD, v & 0xFF, (v >> 8) & 0xFF]; }
  const cc = ops[0].toUpperCase();
  const ccOps: Record<string, number> = { NZ: 0xC4, Z: 0xCC, NC: 0xD4, C: 0xDC, PO: 0xE4, PE: 0xEC, P: 0xF4, M: 0xFC };
  const v = getN16(ops[1]);
  if (cc in ccOps) return [ccOps[cc], v & 0xFF, (v >> 8) & 0xFF];
  throw new Error(`Bad CALL condition: ${cc}`);
}

function asmRET(ops: string[]): number[] {
  if (!ops.length || !ops[0]) return [0xC9];
  const cc = ops[0].toUpperCase();
  const ccOps: Record<string, number> = { NZ: 0xC0, Z: 0xC8, NC: 0xD0, C: 0xD8, PO: 0xE0, PE: 0xE8, P: 0xF0, M: 0xF8 };
  if (cc in ccOps) return [ccOps[cc]];
  return [0xC9];
}

function asmBitOp(mnem: string, ops: string[], getN8: (s: string) => number): number[] {
  const rotOps: Record<string, number> = { RLC: 0, RRC: 1, RL: 2, RR: 3, SLA: 4, SRA: 5, SRL: 7 };
  if (mnem in rotOps) {
    const r = ops[0].toUpperCase();
    const rn = r === '(HL)' ? 6 : (REGS8[r] ?? 0);
    return [0xCB, (rotOps[mnem] << 3) | rn];
  }
  const bitOps: Record<string, number> = { BIT: 0x40, RES: 0x80, SET: 0xC0 };
  const b = getN8(ops[0]) & 7;
  const r2 = ops[1].toUpperCase();
  const rn2 = r2 === '(HL)' ? 6 : (REGS8[r2] ?? 0);
  return [0xCB, bitOps[mnem] | (b << 3) | rn2];
}
