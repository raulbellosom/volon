import { Image } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';

// Official raster artwork from @delivery/branding; never redrawn or recolored here.
const LIGHT = require('@delivery/branding/assets/logo/logo-horizontal-light.png') as number;
const DARK = require('@delivery/branding/assets/logo/logo-horizontal-dark.png') as number;

/** Horizontal Volon logo (3:1) for the active theme. The light file is opaque: place it on `surface` (white). */
export function BrandLogo({ height = 40 }: { height?: number }) {
  const { theme } = useTheme();
  return (
    <Image
      source={theme.name === 'dark' ? DARK : LIGHT}
      accessibilityRole="image"
      accessibilityLabel="Volon"
      resizeMode="contain"
      style={{ height, width: height * 3, alignSelf: 'flex-start' }}
    />
  );
}
