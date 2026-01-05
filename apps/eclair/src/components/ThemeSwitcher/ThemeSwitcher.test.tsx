import {
  render, screen 
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeSwitcher } from './ThemeSwitcher';

function renderWithProvider(): void {
  render(
    <ThemeProvider>
      <ThemeSwitcher />
    </ThemeProvider>,
  );
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  it('renders all three theme options', () => {
    renderWithProvider();

    expect(screen.getByRole('tab', { name: 'Stream' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Voltage' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Circuit' })).toBeInTheDocument();
  });

  it('shows current theme as selected with aria-selected', () => {
    renderWithProvider();

    expect(screen.getByRole('tab', { name: 'Stream' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Voltage' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Circuit' })).toHaveAttribute('aria-selected', 'false');
  });

  it('changes theme when option clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('tab', { name: 'Voltage' }));

    expect(screen.getByRole('tab', { name: 'Voltage' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Stream' })).toHaveAttribute('aria-selected', 'false');
  });

  it('applies theme class to document body when changed', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    expect(document.body.classList.contains('theme-stream')).toBe(true);

    await user.click(screen.getByRole('tab', { name: 'Circuit' }));

    expect(document.body.classList.contains('theme-circuit')).toBe(true);
    expect(document.body.classList.contains('theme-stream')).toBe(false);
  });

  it('has accessible tablist container', () => {
    renderWithProvider();

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Theme selection');
  });

  it('is keyboard navigable via Tab key', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Stream' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Voltage' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Circuit' })).toHaveFocus();
  });

  it('activates theme via keyboard Enter key', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('tab', { name: 'Voltage' })).toHaveAttribute('aria-selected', 'true');
    expect(document.body.classList.contains('theme-voltage')).toBe(true);
  });
});
