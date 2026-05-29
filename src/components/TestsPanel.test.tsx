import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestsPanel } from './TestsPanel';

describe('TestsPanel', () => {
  it('renders panel header', () => {
    render(<TestsPanel tests="" onTestsChange={() => {}} />);
    expect(screen.getByText('TESTS')).toBeInTheDocument();
  });

  it('renders the hint text', () => {
    render(<TestsPanel tests="" onTestsChange={() => {}} />);
    expect(screen.getByText(/assert register\/memory values/)).toBeInTheDocument();
  });

  it('displays the tests value in the textarea', () => {
    render(<TestsPanel tests="assert A == 0" onTestsChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('assert A == 0');
  });

  it('calls onTestsChange when the textarea changes', async () => {
    const onChange = vi.fn();
    render(<TestsPanel tests="" onTestsChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
