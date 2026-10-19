// One import per weight so only these four font files are bundled.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createSyntheticGateway } from './adapters/synthetic/synthetic-gateway.ts';
import { DemoShell } from './app/DemoShell.tsx';
import { BlockedModeScreen } from './app/BlockedModeScreen.tsx';
import { resolveAppMode, type AppMode } from './config/app-mode.ts';
import { ThemeProvider, useTheme } from './theme/ThemeProvider.tsx';

function Themed({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

/** Demo wiring: the synthetic adapter is the only gateway that can be built today. */
function DemoApp() {
  const [services] = useState(() => createSyntheticGateway());
  return <DemoShell {...services} />;
}

export function App({ mode = resolveAppMode() }: { mode?: AppMode }) {
  const [fontsReady] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!fontsReady) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Themed>{mode.kind === 'demo' ? <DemoApp /> : <BlockedModeScreen requested={mode.requested} />}</Themed>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
