import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorPanel } from './EditorPanel';

function defaultProps(overrides = {}) {
  return {
    code: '; test code',
    onCodeChange: vi.fn(),
    onRun: vi.fn(),
    onStep: vi.fn(),
    onReset: vi.fn(),
    onRunTests: vi.fn(),
    onLoadExample: vi.fn(),
    maxSteps: 10000,
    onMaxStepsChange: vi.fn(),
    ...overrides,
  };
}

describe('EditorPanel', () => {
  it('renders panel header', () => {
    render(<EditorPanel {...defaultProps()} />);
    expect(screen.getByText('ASSEMBLY SOURCE')).toBeInTheDocument();
  });

  it('renders example buttons', () => {
    render(<EditorPanel {...defaultProps()} />);
    expect(screen.getByRole('button', { name: 'HELLO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LOOP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FIBONACCI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SORT' })).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    render(<EditorPanel {...defaultProps()} />);
    expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RESET' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▶ RUN TESTS' })).toBeInTheDocument();
  });

  it('displays code in the textarea', () => {
    render(<EditorPanel {...defaultProps({ code: 'LD A, 0' })} />);
    expect(screen.getByRole('textbox')).toHaveValue('LD A, 0');
  });

  it('calls onRun when RUN is clicked', async () => {
    const onRun = vi.fn();
    render(<EditorPanel {...defaultProps({ onRun })} />);
    await userEvent.click(screen.getByRole('button', { name: '▶ RUN' }));
    expect(onRun).toHaveBeenCalledOnce();
  });

  it('calls onStep when STEP is clicked', async () => {
    const onStep = vi.fn();
    render(<EditorPanel {...defaultProps({ onStep })} />);
    await userEvent.click(screen.getByRole('button', { name: 'STEP' }));
    expect(onStep).toHaveBeenCalledOnce();
  });

  it('calls onReset when RESET is clicked', async () => {
    const onReset = vi.fn();
    render(<EditorPanel {...defaultProps({ onReset })} />);
    await userEvent.click(screen.getByRole('button', { name: 'RESET' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls onRunTests when RUN TESTS is clicked', async () => {
    const onRunTests = vi.fn();
    render(<EditorPanel {...defaultProps({ onRunTests })} />);
    await userEvent.click(screen.getByRole('button', { name: '▶ RUN TESTS' }));
    expect(onRunTests).toHaveBeenCalledOnce();
  });

  it('calls onLoadExample with the example name when an example button is clicked', async () => {
    const onLoadExample = vi.fn();
    render(<EditorPanel {...defaultProps({ onLoadExample })} />);
    await userEvent.click(screen.getByRole('button', { name: 'FIBONACCI' }));
    expect(onLoadExample).toHaveBeenCalledWith('fibonacci');
  });

  it('calls onCodeChange when the textarea is edited', async () => {
    const onCodeChange = vi.fn();
    render(<EditorPanel {...defaultProps({ code: '', onCodeChange })} />);
    await userEvent.type(screen.getByRole('textbox'), 'N');
    expect(onCodeChange).toHaveBeenCalled();
  });

  it('renders line numbers matching the code line count', () => {
    const code = 'LINE1\nLINE2\nLINE3';
    const { container } = render(<EditorPanel {...defaultProps({ code })} />);
    const lineNums = container.querySelector('.whitespace-pre.bg-black\\/20');
    expect(lineNums?.textContent).toBe('1\n2\n3');
  });

  it('renders the MAX STEPS select with correct default', () => {
    render(<EditorPanel {...defaultProps({ maxSteps: 10000 })} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('10000');
  });

  it('calls onMaxStepsChange when the select changes', async () => {
    const onMaxStepsChange = vi.fn();
    render(<EditorPanel {...defaultProps({ onMaxStepsChange })} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '100000');
    expect(onMaxStepsChange).toHaveBeenCalledWith(100000);
  });

  it('Tab key in textarea inserts 4 spaces via onCodeChange', () => {
    const onCodeChange = vi.fn();
    render(<EditorPanel {...defaultProps({ code: 'abc', onCodeChange })} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Set selection to position 3 (end of 'abc')
    textarea.setSelectionRange(3, 3);

    fireEvent.keyDown(textarea, { key: 'Tab', code: 'Tab' });

    // onCodeChange should be called with 'abc' + 4 spaces
    expect(onCodeChange).toHaveBeenCalled();
    const newVal = onCodeChange.mock.calls[onCodeChange.mock.calls.length - 1][0] as string;
    expect(newVal).toBe('abc    ');
  });

  it('Tab key at start of line inserts 4 spaces at position 0', () => {
    const onCodeChange = vi.fn();
    render(<EditorPanel {...defaultProps({ code: 'hello', onCodeChange })} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    textarea.setSelectionRange(0, 0);
    fireEvent.keyDown(textarea, { key: 'Tab', code: 'Tab' });

    expect(onCodeChange).toHaveBeenCalled();
    const newVal = onCodeChange.mock.calls[onCodeChange.mock.calls.length - 1][0] as string;
    expect(newVal).toBe('    hello');
  });

  it('Non-Tab key does not call onCodeChange', () => {
    const onCodeChange = vi.fn();
    render(<EditorPanel {...defaultProps({ code: 'abc', onCodeChange })} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    expect(onCodeChange).not.toHaveBeenCalled();
  });
});
