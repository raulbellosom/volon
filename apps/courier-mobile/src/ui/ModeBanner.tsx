import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, use, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from './AppText.tsx';
import { DemoBanner } from './DemoBanner.tsx';

const BannerContext = createContext<ReactNode>(<DemoBanner />);

/** Chooses the banner every `Screen` shows; demo is the default. */
export function ModeBannerProvider({ banner, children }: { banner: ReactNode; children: ReactNode }) {
  return <BannerContext value={banner}>{children}</BannerContext>;
}

export const useModeBanner = (): ReactNode => use(BannerContext);

/** Local-lab mode: real backend on this computer, synthetic accounts only. */
export function LocalBanner() {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Modo local: backend de laboratorio en esta computadora. Solo identidad y disponibilidad; sin ofertas ni entregas."
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2], backgroundColor: theme.colors['feedback-info-bg'] }}
    >
      <Ionicons name="server-outline" size={16} color={theme.colors['feedback-info-fg']} />
      <AppText variant="label" color="feedback-info-fg" style={{ flex: 1 }}>
        Modo local · laboratorio, solo identidad y disponibilidad
      </AppText>
    </View>
  );
}
