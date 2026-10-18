import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, resolveTheme, themeInitScript } from './theme-store.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

describe('theme', () => {
  beforeEach(() => localStorage.clear());

  it('resolves system preference from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('ThemeToggle applies, persists and syncs the choice across toggles', async () => {
    render(<><ThemeToggle /><ThemeToggle compact /></>);
    const [full] = screen.getAllByRole('radiogroup', { name: 'Tema de color' });
    expect(full).toBeDefined();
    await userEvent.click(screen.getAllByRole('radio', { name: 'Oscuro' })[0] as HTMLElement);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    for (const option of screen.getAllByRole('radio', { name: 'Oscuro' })) expect(option).toBeChecked();
    await userEvent.click(screen.getAllByRole('radio', { name: 'Claro' })[1] as HTMLElement);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('exposes an init script that reads the same storage key', () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
    expect(() => new Function(themeInitScript)).not.toThrow();
  });
});
