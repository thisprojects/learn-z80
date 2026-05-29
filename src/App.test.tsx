import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// App imports module-level Z80 and memory; each test re-renders from scratch.
// We don't mock the heavy machinery – we let real assembler/Z80 run.

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App - initial render', () => {
  it('renders the header with Z80 ASSEMBLY LAB text', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Z80 ASSEMBLY LAB/i)).toBeInTheDocument();
    });
  });

  it('renders the ASSEMBLY SOURCE panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('ASSEMBLY SOURCE')).toBeInTheDocument();
    });
  });

  it('renders the REGISTERS panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('REGISTERS')).toBeInTheDocument();
    });
  });

  it('renders the CONSOLE OUTPUT panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('CONSOLE OUTPUT')).toBeInTheDocument();
    });
  });

  it('shows loop example code on mount (DJNZ instruction)', async () => {
    render(<App />);
    await waitFor(() => {
      // The textarea should contain the loop example which includes DJNZ
      const textarea = screen.getAllByRole('textbox')[0];
      expect(textarea.textContent ?? (textarea as HTMLTextAreaElement).value).toMatch(/DJNZ/i);
    });
  });

  it('shows initial console messages on mount', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Z80 Assembly Lab ready/i)).toBeInTheDocument();
    });
  });

  it('renders RUN, STEP, RESET, RUN TESTS buttons', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'RESET' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '▶ RUN TESTS' })).toBeInTheDocument();
    });
  });

  it('renders example loader buttons', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'HELLO' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FIBONACCI' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SORT' })).toBeInTheDocument();
    });
  });

  it('renders the MAX STEPS selector with default 10K', async () => {
    render(<App />);
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('10000');
    });
  });
});

describe('App - RUN button', () => {
  it('clicking RUN shows Assembled and Halted messages in console', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '▶ RUN' }));

    await waitFor(() => {
      expect(screen.getByText(/Assembled/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Halted after/i)).toBeInTheDocument();
    });
  });

  it('clicking RUN shows HALTED indicator in header', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '▶ RUN' }));

    await waitFor(() => {
      expect(screen.getByText('HALTED')).toBeInTheDocument();
    });
  });
});

describe('App - STEP button', () => {
  it('clicking STEP shows step output in console', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'STEP' }));

    await waitFor(() => {
      // STEP emits PC= ... output
      expect(screen.getByText(/PC=/i)).toBeInTheDocument();
    });
  });

  it('stepping multiple times eventually halts', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
    });

    // Click STEP many times to exhaust the loop program
    for (let i = 0; i < 50; i++) {
      await user.click(screen.getByRole('button', { name: 'STEP' }));
    }

    await waitFor(() => {
      expect(screen.getByText('HALTED')).toBeInTheDocument();
    });
  });
});

describe('App - RESET button', () => {
  it('clicking RESET shows CPU RESET message in console', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'RESET' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'RESET' }));

    await waitFor(() => {
      expect(screen.getByText(/CPU RESET/i)).toBeInTheDocument();
    });
  });

  it('RESET clears the halted indicator after RUN', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument();
    });

    // First RUN to halted state
    await user.click(screen.getByRole('button', { name: '▶ RUN' }));
    await waitFor(() => {
      expect(screen.getByText('HALTED')).toBeInTheDocument();
    });

    // Then RESET
    await user.click(screen.getByRole('button', { name: 'RESET' }));
    await waitFor(() => {
      expect(screen.queryByText('HALTED')).not.toBeInTheDocument();
    });
  });
});

describe('App - RUN TESTS button', () => {
  it('clicking RUN TESTS shows PASS results for loop example', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN TESTS' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '▶ RUN TESTS' }));

    await waitFor(() => {
      expect(screen.getByText(/tests passed/i)).toBeInTheDocument();
    });
  });

  it('shows PASS lines for loop example assertions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '▶ RUN TESTS' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '▶ RUN TESTS' }));

    await waitFor(() => {
      const passItems = screen.getAllByText(/PASS/i);
      expect(passItems.length).toBeGreaterThan(0);
    });
  });
});

describe('App - example loaders', () => {
  it('clicking HELLO loads the hello example (contains LDIR)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'HELLO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'HELLO' }));

    await waitFor(() => {
      expect(screen.getByText(/Loaded example: HELLO/i)).toBeInTheDocument();
    });

    const textarea = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/LDIR/i);
  });

  it('clicking FIBONACCI loads fibonacci example', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'FIBONACCI' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'FIBONACCI' }));

    await waitFor(() => {
      expect(screen.getByText(/Loaded example: FIBONACCI/i)).toBeInTheDocument();
    });

    const textarea = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/FIB/i);
  });

  it('clicking SORT loads sort example', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SORT' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SORT' }));

    await waitFor(() => {
      expect(screen.getByText(/Loaded example: SORT/i)).toBeInTheDocument();
    });

    const textarea = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/BUBBLE|SORT|sort/i);
  });

  it('clicking LOOP loads the loop example', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'LOOP' })).toBeInTheDocument();
    });

    // First load HELLO, then switch to LOOP
    await user.click(screen.getByRole('button', { name: 'HELLO' }));
    await user.click(screen.getByRole('button', { name: 'LOOP' }));

    await waitFor(() => {
      expect(screen.getByText(/Loaded example: LOOP/i)).toBeInTheDocument();
    });

    const textarea = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/DJNZ/i);
  });
});

describe('App - MAX STEPS select', () => {
  it('can change MAX STEPS to 1K', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1000');
    expect(screen.getByRole('combobox')).toHaveValue('1000');
  });

  it('can change MAX STEPS to 100K', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '100000');
    expect(screen.getByRole('combobox')).toHaveValue('100000');
  });
});

describe('App - code textarea editing', () => {
  it('code textarea is editable', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')[0]).toBeInTheDocument();
    });

    const codeTextarea = screen.getAllByRole('textbox')[0];
    await user.click(codeTextarea);
    // Just verify it is interactive (not disabled/readonly)
    expect(codeTextarea).not.toBeDisabled();
  });
});

describe('App - tests panel interaction', () => {
  it('tests textarea is editable', async () => {
    render(<App />);

    await waitFor(() => {
      const textareas = screen.getAllByRole('textbox');
      expect(textareas.length).toBeGreaterThanOrEqual(2);
    });

    const textareas = screen.getAllByRole('textbox');
    const testsTextarea = textareas[1];
    expect(testsTextarea).not.toBeDisabled();
  });

  it('RUN TESTS with empty tests shows "No tests defined"', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(2);
    });

    // Clear the tests textarea
    const textareas = screen.getAllByRole('textbox');
    const testsTextarea = textareas[1];
    await user.clear(testsTextarea);

    await user.click(screen.getByRole('button', { name: '▶ RUN TESTS' }));

    await waitFor(() => {
      expect(screen.getByText(/No tests defined/i)).toBeInTheDocument();
    });
  });
});

describe('App - CLR button in console', () => {
  it('CLR button clears the console', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial messages
    await waitFor(() => {
      expect(screen.getByText(/Z80 Assembly Lab ready/i)).toBeInTheDocument();
    });

    const clrButton = screen.getByRole('button', { name: 'CLR' });
    await user.click(clrButton);

    await waitFor(() => {
      expect(screen.queryByText(/Z80 Assembly Lab ready/i)).not.toBeInTheDocument();
    });
  });
});

describe('App - STEP on halted CPU', () => {
  it('STEP produces PC= output in console indicating step execution', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
    });

    // STEP 3 times - first STEP builds and loads code, subsequent steps run instructions
    await user.click(screen.getByRole('button', { name: 'STEP' }));
    await user.click(screen.getByRole('button', { name: 'STEP' }));
    await user.click(screen.getByRole('button', { name: 'STEP' }));

    await waitFor(() => {
      // STEP shows PC=... output for each step
      const pcMessages = screen.queryAllByText(/PC=/);
      expect(pcMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('STEP produces Assembled message on first click (builds on demand)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'STEP' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'STEP' }));

    await waitFor(() => {
      // First STEP calls buildAndLoad which logs "Assembled X bytes"
      expect(screen.getByText(/Assembled/i)).toBeInTheDocument();
    });
  });
});

// App.tsx lines 44-45: assembly error path (buildAndLoad returns false)
describe('App - assembly error path (lines 44-45)', () => {
  it('shows error in console when code has a syntax error', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Wait for initial mount effect to complete
    await waitFor(() => expect(screen.getByText(/Assembly Lab ready/i)).toBeInTheDocument());

    // Use fireEvent.change to reliably replace the controlled textarea value
    const [editor] = screen.getAllByRole('textbox');
    await act(async () => {
      fireEvent.change(editor, { target: { value: 'BADOPCODE' } });
    });

    await user.click(screen.getByRole('button', { name: '▶ RUN' }));

    await waitFor(() => {
      // assembler error message: "✗ Line 1: Unknown mnemonic: BADOPCODE [BADOPCODE]"
      expect(screen.getByText(/Unknown mnemonic/i)).toBeInTheDocument();
    });
  });
});

// App.tsx line 66: no-HALT warning (CPU reaches max steps without halting)
describe('App - no-HALT warning (line 66)', () => {
  it('shows "Stopped after" warning when code has no HALT', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: '▶ RUN' })).toBeInTheDocument());

    // Write an infinite loop with no HALT
    const [editor] = screen.getAllByRole('textbox');
    await user.clear(editor);
    await user.type(editor, 'JR 0');

    // Set max steps to 1K so the test runs fast
    await user.selectOptions(screen.getByRole('combobox'), '1000');
    await user.click(screen.getByRole('button', { name: '▶ RUN' }));

    await waitFor(() => {
      expect(screen.getByText(/Stopped after/i)).toBeInTheDocument();
    });
  });
});

// App.tsx lines 120-122: failing test assertions in handleRunTests
describe('App - failing test assertions (lines 120-122)', () => {
  it('shows FAIL line and error summary when an assertion fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: '▶ RUN TESTS' })).toBeInTheDocument());

    // Load the loop example (A=55 after run)
    await user.click(screen.getByRole('button', { name: 'LOOP' }));

    // Replace test with a failing assertion
    const textareas = screen.getAllByRole('textbox');
    const testsTextarea = textareas[1];
    await user.clear(testsTextarea);
    await user.type(testsTextarea, 'assert A == 0x99');

    await user.click(screen.getByRole('button', { name: '▶ RUN TESTS' }));

    await waitFor(() => {
      expect(screen.getByText(/FAIL/)).toBeInTheDocument();
      expect(screen.getByText(/0\/1 tests passed/)).toBeInTheDocument();
    });
  });
});
