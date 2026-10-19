import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useDemoControls } from '../../app/DemoServices.tsx';
import type { GatewayErrorKind } from '../../ports/courier-gateway.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { Button } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Notice } from '../../ui/Notice.tsx';
import { Screen } from '../../ui/Screen.tsx';

const FAILURES: readonly { kind: GatewayErrorKind; label: string }[] = [
  { kind: 'offline', label: 'Sin conexión' },
  { kind: 'conflict', label: 'Conflicto de operación' },
  { kind: 'unavailable', label: 'Servicio caído' },
];

/** Knobs of the synthetic adapter to see offline, conflict and error states on purpose. */
export function DemoControlsScreen() {
  const { theme } = useTheme();
  const controls = useDemoControls();
  const { actions } = useCourier();
  const [offline, setOffline] = useState(controls.isOffline());
  const [armed, setArmed] = useState<GatewayErrorKind | null>(null);

  return (
    <Screen>
      <Notice tone="info" title="Solo para la demostración">
        Estos controles cambian el comportamiento del servidor simulado en este teléfono.
      </Notice>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], minHeight: theme.touch.min }}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>Simular sin conexión</AppText>
          <Switch
            accessibilityLabel="Simular sin conexión"
            value={offline}
            onValueChange={(value) => {
              controls.setOffline(value);
              setOffline(value);
            }}
            trackColor={{ true: theme.colors['selection-fill'], false: theme.colors['surface-sunken'] }}
            thumbColor={offline ? theme.colors['selection-mark'] : theme.colors.surface}
          />
        </View>
      </Card>
      <Card>
        <AppText variant="bodyStrong">Hacer fallar la siguiente operación</AppText>
        {FAILURES.map((failure) => (
          <Button
            key={failure.kind}
            label={armed === failure.kind ? `${failure.label} (preparado)` : failure.label}
            variant={armed === failure.kind ? 'primary' : 'secondary'}
            onPress={() => {
              controls.failNext(failure.kind);
              setArmed(failure.kind);
            }}
          />
        ))}
      </Card>
      <Button
        label="Reiniciar demostración"
        icon="refresh-outline"
        variant="danger"
        onPress={() => {
          controls.reset();
          actions.signOut();
        }}
      />
    </Screen>
  );
}
