import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { ColorTokenName } from '@delivery/design-tokens';
import { useTheme } from '../theme/ThemeProvider.tsx';
import type { FontWeightName } from '../theme/theme.ts';

const VARIANTS = {
  display: { step: '3xl', weight: 'extrabold' },
  title: { step: '2xl', weight: 'extrabold' },
  heading: { step: 'lg', weight: 'bold' },
  body: { step: 'md', weight: 'regular' },
  bodyStrong: { step: 'md', weight: 'semibold' },
  label: { step: 'sm', weight: 'semibold' },
  caption: { step: 'sm', weight: 'regular' },
  overline: { step: 'xs', weight: 'bold' },
} as const satisfies Record<string, { step: string; weight: FontWeightName }>;

export type TextVariant = keyof typeof VARIANTS;

export interface AppTextProps {
  children: ReactNode;
  variant?: TextVariant;
  /** Semantic color token; defaults to primary text. */
  color?: ColorTokenName;
  /** Marks screen and section titles for screen readers. */
  heading?: boolean;
  align?: 'auto' | 'center';
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/** Text bound to the type scale. Scales with the system font size (capped so layouts survive). */
export function AppText({ children, variant = 'body', color = 'text-primary', heading, align = 'auto', numberOfLines, style }: AppTextProps) {
  const { theme } = useTheme();
  const { step, weight } = VARIANTS[variant];
  const scale = theme.type[step];
  const overline = variant === 'overline';
  return (
    <Text
      accessibilityRole={heading ? 'header' : 'text'}
      maxFontSizeMultiplier={1.6}
      {...(numberOfLines ? { numberOfLines } : {})}
      style={[
        {
          color: theme.colors[color],
          fontFamily: theme.fonts[weight],
          fontSize: scale.size,
          lineHeight: scale.lineHeight,
          letterSpacing: (overline ? 0.14 : scale.tracking) * scale.size,
          textAlign: align,
          textTransform: overline ? 'uppercase' : 'none',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
