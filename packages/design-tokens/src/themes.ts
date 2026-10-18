import type { ColorTheme, ThemeName } from './color-tokens.ts';
import { darkTheme } from './themes/dark.ts';
import { lightTheme } from './themes/light.ts';

export type {
  ColorTheme,
  ColorTokenName,
  FeedbackColorTokenName,
  FeedbackTone,
  StatusColorTokenName,
  ThemeName,
} from './color-tokens.ts';

export const colorThemes: Readonly<Record<ThemeName, ColorTheme>> = Object.freeze({
  light: lightTheme,
  dark: darkTheme,
});
