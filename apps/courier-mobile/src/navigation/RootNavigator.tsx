import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen } from '../features/auth/SignInScreen.tsx';
import { DeliveryScreen } from '../features/delivery/DeliveryScreen.tsx';
import { OfferDetailScreen } from '../features/offers/OfferDetailScreen.tsx';
import { OffersScreen } from '../features/offers/OffersScreen.tsx';
import { HomeScreen } from '../features/shift/HomeScreen.tsx';
import { DemoControlsScreen } from '../features/unavailable/DemoControlsScreen.tsx';
import { UnavailableScreen } from '../features/unavailable/UnavailableScreen.tsx';
import { useCourier } from '../state/CourierProvider.tsx';
import { useTheme } from '../theme/ThemeProvider.tsx';
import type { RootStackParamList } from './routes.ts';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Signed-out users only see the demo sign-in; everything else needs the synthetic session. */
export function RootNavigator() {
  const { theme } = useTheme();
  const { state } = useCourier();
  const base = theme.name === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors['action-primary'],
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors['text-primary'],
      border: theme.colors['border-subtle'],
      notification: theme.colors['action-accent'],
    },
  };
  const headerTitleStyle = { fontFamily: theme.fonts.bold, color: theme.colors['text-primary'] };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerTitleStyle, headerTintColor: theme.colors['text-primary'], headerBackButtonDisplayMode: 'minimal' }}>
        {state.identity ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mi turno' }} />
            <Stack.Screen name="Offers" component={OffersScreen} options={{ title: 'Ofertas' }} />
            <Stack.Screen name="OfferDetail" component={OfferDetailScreen} options={{ title: 'Detalle de la oferta' }} />
            <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: 'Entrega en curso' }} />
            <Stack.Screen name="Unavailable" component={UnavailableScreen} options={{ title: 'Funciones no disponibles' }} />
            <Stack.Screen name="DemoControls" component={DemoControlsScreen} options={{ title: 'Controles de demostración' }} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
