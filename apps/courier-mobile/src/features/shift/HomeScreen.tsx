import { View } from 'react-native';
import { stageInfo } from '../../domain/workflow.ts';
import type { ScreenProps } from '../../navigation/routes.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { Button } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Notice } from '../../ui/Notice.tsx';
import { Screen } from '../../ui/Screen.tsx';
import { StatusPill } from '../../ui/StatusPill.tsx';
import { StopBlock } from '../../ui/StopBlock.tsx';
import { errorCopy } from '../shared/error-copy.ts';
import { SHIFT_COPY } from './shift-copy.ts';
import { ThemeChoice } from './ThemeChoice.tsx';

/** Shift home: simulated availability, the delivery in progress and the way to offers. */
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { theme } = useTheme();
  const { state, actions } = useCourier();
  const { shift, active, shiftCommand, identity } = state;
  const copy = SHIFT_COPY[shift];
  const inProgress = active && active.stage !== 'delivered';

  const primary = inProgress
    ? <Button label="Continuar entrega" icon="bicycle-outline" size="action" onPress={() => navigation.navigate('Delivery')} />
    : shift === 'available'
      ? <Button label="Ver ofertas" icon="list-outline" size="action" variant="accent" onPress={() => navigation.navigate('Offers')} />
      : <Button label="Ponerme disponible" icon="power-outline" size="action" pending={shiftCommand.pending} onPress={() => void actions.setAvailability(true)} />;

  return (
    <Screen footer={primary}>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="overline" color="text-link">{identity?.displayName ?? 'Repartidor'}</AppText>
        <AppText variant="title" heading>{copy.title}</AppText>
        <StatusPill label={copy.pill} tone={copy.tone} icon={copy.icon} />
      </View>

      <Notice tone="info" title="Disponibilidad simulada">
        Tu estado solo cambia en este teléfono. No se informa a ningún servidor ni se comparte tu ubicación.
      </Notice>

      {shiftCommand.error && (
        <Notice tone="danger" title={errorCopy(shiftCommand.error).title} live>{errorCopy(shiftCommand.error).description}</Notice>
      )}

      {inProgress && active && (
        <Card>
          <View style={{ gap: theme.spacing[1] }}>
            <AppText variant="overline" color="text-secondary">Entrega en curso · {active.offer.reference}</AppText>
            <AppText variant="heading">{stageInfo(active.stage).label}</AppText>
          </View>
          <StopBlock kind="pickup" title={active.offer.pickup.title} addressLine={active.offer.pickup.addressLine} compact />
          <StopBlock kind="dropoff" title={active.offer.dropoff.title} addressLine={active.offer.dropoff.addressLine} compact />
        </Card>
      )}

      {shift === 'available' && (
        <Button label="Terminar turno" icon="moon-outline" variant="ghost" pending={shiftCommand.pending} onPress={() => void actions.setAvailability(false)} />
      )}

      <View style={{ gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
        <AppText variant="heading" heading>Más opciones</AppText>
        <ThemeChoice />
        <Button label="Funciones no disponibles" icon="information-circle-outline" variant="secondary" onPress={() => navigation.navigate('Unavailable')} />
        <Button label="Controles de demostración" icon="construct-outline" variant="secondary" onPress={() => navigation.navigate('DemoControls')} />
        <Button label="Salir de la demostración" icon="log-out-outline" variant="ghost" onPress={actions.signOut} />
      </View>
    </Screen>
  );
}
