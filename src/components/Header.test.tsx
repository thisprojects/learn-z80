import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders the title', () => {
    render(<Header isHalted={false} />);
    expect(screen.getByText('Z80 ASM LAB')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Header isHalted={false} />);
    expect(screen.getByText(/ZILOG Z80/)).toBeInTheDocument();
  });

  it('renders the version badge', () => {
    render(<Header isHalted={false} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('does not show HALTED when isHalted=false', () => {
    render(<Header isHalted={false} />);
    expect(screen.queryByText('HALTED')).not.toBeInTheDocument();
  });

  it('shows HALTED indicator when isHalted=true', () => {
    render(<Header isHalted={true} />);
    expect(screen.getByText('HALTED')).toBeInTheDocument();
  });
});
