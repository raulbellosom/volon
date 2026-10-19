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
import { EmptyState } from '../../ui/StateViews.tsx';
import { StatusPill } from '../../ui/StatusPill.tsx';
import { StopBlock } from '../../ui/StopBlock.tsx';
import { errorCopy } from '../shared/error-copy.ts';
import { StageProgress } from './StageProgress.tsx';

/**
 * Accepted delivery with the simulated steps. One big button moves to the next step; the steps
 * never reach a server and are not authorized backend transitions.
 */
export function DeliveryScreen({ navigation }: ScreenProps<'Delivery'>) {
  const { theme } = useTheme();
  const { state, actions } = useCourier();
  const { active, step } = state;

  if (!active) {
    return (
      <Screen>
        <EmptyState
          icon="bicycle-outline"
          title="No tienes una entrega en curso"
          description="Acepta una oferta para empezar."
          actions={<Button label="Ir a mi turno" icon="home-outline" onPress={() => navigation.navigate('Home')} />}
        />
      </Screen>
    );
  }

  const info = stageInfo(active.stage);
  const done = active.stage === 'delivered';
  const finish = () => {
    actions.closeDelivery();
    navigation.navigate('Home');
  };
  const footer = done
    ? <Button label="Volver a mi turno" icon="home-outline" size="action" onPress={finish} />
    : <Button label={info.action ?? ''} icon="arrow-forward-circle-outline" size="action" pending={step.pending} hint="Avanza a la siguiente etapa simulada" onPress={() => void actions.advance()} />;

  return (
    <Screen footer={footer}>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="overline" color="text-secondary">{active.offer.reference} · {active.offer.packageNote}</AppText>
        <AppText variant="title" heading>{info.label}</AppText>
        <StatusPill label="Simulación local" tone="warning" icon="flask-outline" />
      </View>

      {done && (
        <Notice tone="success" title="Entrega completada (simulada)" live>
          No se registró ninguna entrega real ni se generó un pago. Ya puedes recibir nuevas ofertas.
        </Notice>
      )}
      {step.error && (
        <Notice tone={step.error === 'conflict' ? 'warning' : 'danger'} title={step.error === 'conflict' ? 'Esta etapa ya cambió' : errorCopy(step.error).title} live>
          {step.error === 'conflict' ? 'Otra acción la actualizó antes. Revisa la etapa actual.' : errorCopy(step.error).description}
        </Notice>
      )}

      <Card>
        <StopBlock kind="pickup" {...active.offer.pickup} />
        <StopBlock kind="dropoff" {...active.offer.dropoff} />
      </Card>

      <View style={{ gap: theme.spacing[3] }}>
        <AppText variant="heading" heading>Etapas</AppText>
        <StageProgress stage={active.stage} />
      </View>

      <Notice tone="info" title="Sin GPS, mapa ni tiempo estimado">
        Estas etapas solo cambian en este teléfono para practicar el flujo. No se comparte tu ubicación ni se avisa al comercio.
      </Notice>
    </Screen>
  );
}
