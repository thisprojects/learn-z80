import { useState, useRef, useEffect } from 'react';
import { Z80 } from './lib/z80';
import { assemble } from './lib/assembler';
import { runTestSuite, fmtHex } from './lib/testRunner';
import { EXAMPLES } from './lib/examples';
import { Header } from './components/Header';
import { EditorPanel } from './components/EditorPanel';
import { RegisterPanel, snapshotCPU, type RegSnapshot } from './components/RegisterPanel';
import { ConsoleOutput, type LogEntry } from './components/ConsoleOutput';
import { TestsPanel } from './components/TestsPanel';

const initialMemory = new Uint8Array(65536);
const initialCPU = new Z80(initialMemory);

export default function App() {
  const memoryRef = useRef<Uint8Array>(initialMemory);
  const cpuRef = useRef<Z80>(initialCPU);
  const stepLoadedRef = useRef(false);

  const [code, setCode] = useState(EXAMPLES.loop.code);
  const [tests, setTests] = useState(EXAMPLES.loop.tests);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isHalted, setIsHalted] = useState(false);
  const [maxSteps, setMaxSteps] = useState(10000);
  const [regs, setRegs] = useState<RegSnapshot>(snapshotCPU(cpuRef.current));
  const [prevRegs, setPrevRegs] = useState<RegSnapshot | null>(null);

  const log = (msg: string, cls: LogEntry['cls'] = 'info') => {
    setLogs(prev => [...prev, { msg, cls }]);
  };

  const clearConsole = () => setLogs([]);

  const updateRegs = () => {
    setRegs(prev => {
      setPrevRegs(prev);
      return snapshotCPU(cpuRef.current);
    });
  };

  const buildAndLoad = (): boolean => {
    const result = assemble(code);
    if (result.errors.length) {
      for (const e of result.errors) log('✗ ' + e, 'err');
      return false;
    }
    memoryRef.current.fill(0);
    cpuRef.current.reset();
    for (let i = 0; i < result.bytes.length; i++) {
      if (result.bytes[i] !== undefined) memoryRef.current[i] = result.bytes[i]!;
    }
    log(`Assembled ${result.size} bytes  (${Object.keys(result.labels).length} labels)`, 'ok');
    return true;
  };

  const handleRun = () => {
    clearConsole();
    if (!buildAndLoad()) return;
    const cpu = cpuRef.current;
    let steps = 0;
    while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
    if (cpu.halted) {
      setIsHalted(true);
      setLogs(prev => [...prev, { msg: `Halted after ${steps} steps`, cls: 'ok' }]);
    } else {
      setLogs(prev => [...prev, { msg: `Stopped after ${maxSteps} steps (no HALT)`, cls: 'warn' }]);
    }
    stepLoadedRef.current = false;
    updateRegs();
  };

  const handleStep = () => {
    const cpu = cpuRef.current;
    if (!stepLoadedRef.current) {
      clearConsole();
      if (!buildAndLoad()) return;
      stepLoadedRef.current = true;
    }
    if (cpu.halted) { log('CPU is halted', 'warn'); return; }
    const pc = cpu.PC;
    cpu.step();
    log(
      `PC=${fmtHex(pc, 4)}  step → PC=${fmtHex(cpu.PC, 4)}  A=${fmtHex(cpu.A, 2)} BC=${fmtHex(cpu.BC, 4)} HL=${fmtHex(cpu.HL, 4)}`,
      'info'
    );
    if (cpu.halted) {
      setIsHalted(true);
      setLogs(prev => [...prev, { msg: 'HALTED', cls: 'ok' }]);
      stepLoadedRef.current = false;
    }
    updateRegs();
  };

  const handleReset = () => {
    memoryRef.current.fill(0);
    cpuRef.current.reset();
    stepLoadedRef.current = false;
    setPrevRegs(null);
    setRegs(snapshotCPU(cpuRef.current));
    setIsHalted(false);
    log('── CPU RESET ──', 'info');
  };

  const handleRunTests = () => {
    clearConsole();
    if (!buildAndLoad()) return;
    const cpu = cpuRef.current;
    let steps = 0;
    while (!cpu.halted && steps < maxSteps) { cpu.step(); steps++; }
    updateRegs();

    if (!tests.trim()) { log('No tests defined', 'warn'); return; }
    const results = runTestSuite(cpu, tests);
    let pass = 0, fail = 0;
    for (const r of results) {
      if (r.pass) {
        setLogs(prev => [...prev, { msg: `  PASS  ${r.name}`, cls: 'test-pass' }]);
        pass++;
      } else {
        const digits = r.reg && r.reg.length <= 2 ? 2 : 4;
        setLogs(prev => [...prev, { msg: `  FAIL  ${r.name}  (got ${fmtHex(r.actual, digits)})`, cls: 'test-fail' }]);
        fail++;
      }
    }
    const total = pass + fail;
    setLogs(prev => [...prev, { msg: `${pass}/${total} tests passed`, cls: pass === total ? 'ok' : 'err' }]);
  };

  const handleLoadExample = (name: string) => {
    const ex = EXAMPLES[name];
    if (!ex) return;
    setCode(ex.code);
    setTests(ex.tests);
    setIsHalted(false);
    stepLoadedRef.current = false;
    clearConsole();
    log(`Loaded example: ${name.toUpperCase()}`, 'info');
  };

  useEffect(() => {
    handleLoadExample('loop');
    updateRegs();
    setLogs([
      { msg: 'Z80 Assembly Lab ready. Press RUN or STEP.', cls: 'ok' },
      { msg: 'Write tests in the right panel using: assert A == 0x37', cls: 'info' },
    ]);
  }, []);

  return (
    <div className="bg-black text-[#c8ffc8] font-['Share_Tech_Mono'] text-[13px] h-screen overflow-hidden flex flex-col crt-scanlines p-4">
      <div className="flex flex-col flex-1 overflow-hidden border border-[#2a5a2a] shadow-[0_0_40px_rgba(0,255,65,0.15)]">
      <Header isHalted={isHalted} />
      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: '1fr 220px',
          gridTemplateRows: '1fr 180px',
          gap: '1px',
          background: '#1a3a1a',
        }}
      >
        <EditorPanel
          code={code}
          onCodeChange={setCode}
          onRun={handleRun}
          onStep={handleStep}
          onReset={handleReset}
          onRunTests={handleRunTests}
          onLoadExample={handleLoadExample}
          maxSteps={maxSteps}
          onMaxStepsChange={setMaxSteps}
        />
        <RegisterPanel regs={regs} prevRegs={prevRegs} />
        <div
          className="bg-[#0a0e0a] grid overflow-hidden"
          style={{ gridColumn: '1 / 3', gridTemplateColumns: '1fr 1fr', gap: '0' }}
        >
          <ConsoleOutput logs={logs} onClear={clearConsole} />
          <TestsPanel tests={tests} onTestsChange={setTests} />
        </div>
      </div>
      </div>
    </div>
  );
}
