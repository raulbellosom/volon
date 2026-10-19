import { View } from 'react-native';
import { DEMO_COURIER } from '../../adapters/synthetic/fixtures.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { BrandLogo } from '../../ui/BrandLogo.tsx';
import { Button } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Notice } from '../../ui/Notice.tsx';
import { Screen } from '../../ui/Screen.tsx';
import { errorCopy } from '../shared/error-copy.ts';

/** Demo access: a fictitious courier, no account, password or real identity involved. */
export function SignInScreen() {
  const { theme } = useTheme();
  const { state, actions } = useCourier();
  const { pending, error } = state.signIn;
  return (
    <Screen
      footer={<Button label="Entrar en modo demostración" icon="log-in-outline" size="action" pending={pending} onPress={() => void actions.signIn()} />}
    >
      <View style={{ height: theme.spacing[8] }} />
      <Card>
        <BrandLogo height={40} />
        <View style={{ gap: theme.spacing[2] }}>
          <AppText variant="display" heading>App de repartidores</AppText>
          <AppText color="text-secondary">
            Prueba cómo se verán tus ofertas y entregas. Todo lo que ves aquí es ficticio.
          </AppText>
        </View>
      </Card>
      <Notice tone="info" title={`Entrarás como «${DEMO_COURIER.displayName}»`}>
        No se usa ninguna cuenta real ni se pide contraseña. Nada de lo que hagas crea entregas, asignaciones o pagos.
      </Notice>
      {error && (
        <Notice tone="danger" title={errorCopy(error).title} live>
          {errorCopy(error).description}
        </Notice>
      )}
    </Screen>
  );
}
