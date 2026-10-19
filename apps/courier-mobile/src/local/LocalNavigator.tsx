import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UnavailableScreen } from '../features/unavailable/UnavailableScreen.tsx';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { LocalShiftScreen } from './LocalShiftScreen.tsx';
import { LocalSignInScreen } from './LocalSignInScreen.tsx';
import { useLocalSession } from './LocalSessionProvider.tsx';
import { NotConnectedScreen } from './NotConnectedScreen.tsx';

export type LocalStackParamList = {
  SignIn: undefined;
  Shift: undefined;
  NotConnected: undefined;
  Unavailable: undefined;
};

const Stack = createNativeStackNavigator<LocalStackParamList>();

/** Local-lab navigation: identity and availability only; no demo offers or delivery screens. */
export function LocalNavigator() {
  const { theme } = useTheme();
  const { session } = useLocalSession();
  const base = theme.name === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: { ...base.colors, primary: theme.colors['action-primary'], background: theme.colors.background, card: theme.colors.surface, text: theme.colors['text-primary'], border: theme.colors['border-subtle'] },
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerTitleStyle: { fontFamily: theme.fonts.bold, color: theme.colors['text-primary'] }, headerTintColor: theme.colors['text-primary'], headerBackButtonDisplayMode: 'minimal' }}>
        {session ? (
          <>
            <Stack.Screen name="Shift" component={LocalShiftScreen} options={{ title: 'Mi disponibilidad' }} />
            <Stack.Screen name="NotConnected" component={NotConnectedScreen} options={{ title: 'Ofertas y entregas' }} />
            <Stack.Screen name="Unavailable" component={UnavailableScreen} options={{ title: 'Funciones no disponibles' }} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={LocalSignInScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
