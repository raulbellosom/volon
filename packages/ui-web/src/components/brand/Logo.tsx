import { brand } from '@delivery/branding';
import monoDark from '@delivery/branding/assets/logo/logo-mono-dark.png';
import primary from '@delivery/branding/assets/logo/logo-primary.png';
import taglineDark from '@delivery/branding/assets/logo/logo-tagline-dark.png';
import tagline from '@delivery/branding/assets/logo/logo-tagline.png';
import symbol from '@delivery/branding/assets/logo/symbol.png';
import { cx } from '../../utils/cx.ts';

export type LogoVariant = 'wordmark' | 'tagline' | 'symbol';

const SOURCES: Record<LogoVariant, { light: string; dark: string }> = {
  wordmark: { light: primary, dark: monoDark },
  tagline: { light: tagline, dark: taglineDark },
  symbol: { light: symbol, dark: symbol },
};

/** Height utilities by size; width follows the artwork aspect ratio. */
const SIZES = { sm: 'h-7', md: 'h-9', lg: 'h-14', xl: 'h-20' } as const;

export interface LogoProps {
  variant?: LogoVariant;
  size?: keyof typeof SIZES;
  /** Always use the white artwork (brand gradient panels and dark photos). */
  onBrand?: boolean;
  /** Override the accessible name; pass `""` when a visible brand name sits next to it. */
  alt?: string;
  className?: string;
}

/**
 * Official raster artwork from @delivery/branding (no SVG yet; see docs/brand/identity.md).
 * Swaps to the dark-background version with the theme. Never recreate the logo with text.
 */
export function Logo({ variant = 'wordmark', size = 'md', onBrand, alt = brand.displayName, className }: LogoProps) {
  const { light, dark } = SOURCES[variant];
  const image = cx('w-auto max-w-none shrink-0 select-none', SIZES[size]);
  // The wrapper absorbs flex/grid stretching so the artwork always keeps its aspect ratio.
  return (
    <span className={cx('inline-flex max-w-full', className)}>
      {onBrand || light === dark ? (
        <img src={onBrand ? dark : light} alt={alt} draggable={false} className={image} />
      ) : (
        <>
          <img src={light} alt={alt} draggable={false} className={cx(image, 'dark:hidden')} />
          <img src={dark} alt={alt} draggable={false} className={cx(image, 'hidden dark:block')} />
        </>
      )}
    </span>
  );
}
