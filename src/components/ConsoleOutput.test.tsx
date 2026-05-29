import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsoleOutput, type LogEntry } from './ConsoleOutput';

const logs: LogEntry[] = [
  { msg: 'Assembled 11 bytes', cls: 'ok' },
  { msg: 'Some error', cls: 'err' },
  { msg: 'A warning', cls: 'warn' },
  { msg: 'Info line', cls: 'info' },
  { msg: 'PASS foo == 1', cls: 'test-pass' },
  { msg: 'FAIL bar == 2', cls: 'test-fail' },
];

describe('ConsoleOutput', () => {
  it('renders panel header', () => {
    render(<ConsoleOutput logs={[]} onClear={() => {}} />);
    expect(screen.getByText('CONSOLE OUTPUT')).toBeInTheDocument();
  });

  it('renders all log messages', () => {
    render(<ConsoleOutput logs={logs} onClear={() => {}} />);
    expect(screen.getByText('Assembled 11 bytes')).toBeInTheDocument();
    expect(screen.getByText('Some error')).toBeInTheDocument();
    expect(screen.getByText('A warning')).toBeInTheDocument();
    expect(screen.getByText('Info line')).toBeInTheDocument();
    expect(screen.getByText('PASS foo == 1')).toBeInTheDocument();
    expect(screen.getByText('FAIL bar == 2')).toBeInTheDocument();
  });

  it('renders CLR button', () => {
    render(<ConsoleOutput logs={[]} onClear={() => {}} />);
    expect(screen.getByRole('button', { name: 'CLR' })).toBeInTheDocument();
  });

  it('calls onClear when CLR is clicked', async () => {
    const onClear = vi.fn();
    render(<ConsoleOutput logs={[]} onClear={onClear} />);
    await userEvent.click(screen.getByRole('button', { name: 'CLR' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('renders empty state with no logs', () => {
    const { container } = render(<ConsoleOutput logs={[]} onClear={() => {}} />);
    const logArea = container.querySelector('.overflow-y-auto');
    expect(logArea?.children).toHaveLength(0);
  });
});
