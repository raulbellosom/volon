import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo.tsx';

describe('Logo', () => {
  it('renders light and dark artwork with the brand name, swapping by theme class', () => {
    render(<Logo />);
    const images = screen.getAllByRole('img', { name: 'Volon' });
    expect(images).toHaveLength(2);
    expect(images[0]?.className).toContain('dark:hidden');
    expect(images[1]?.className).toContain('dark:block');
  });

  it('uses only the white artwork on brand panels', () => {
    render(<Logo variant="tagline" onBrand />);
    const [image] = screen.getAllByRole('img', { name: 'Volon' });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(image?.getAttribute('src')).toMatch(/dark/);
  });

  it('wraps the image so stretching containers cannot distort it and allows decorative use', () => {
    const { container } = render(<Logo alt="" />);
    expect(container.firstElementChild?.tagName).toBe('SPAN');
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(2);
    expect(screen.queryByRole('img', { name: 'Volon' })).not.toBeInTheDocument();
  });
});
