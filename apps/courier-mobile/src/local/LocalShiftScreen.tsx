import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ThemeChoice } from '../features/shift/ThemeChoice.tsx';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from '../ui/AppText.tsx';
import { Button } from '../ui/Button.tsx';
import { Notice } from '../ui/Notice.tsx';
import { Screen } from '../ui/Screen.tsx';
import { EmptyState, LoadingState } from '../ui/StateViews.tsx';
import { accountCopy } from './account-copy.ts';
import { AvailabilityCard } from './AvailabilityCard.tsx';
import { useLocalSession } from './LocalSessionProvider.tsx';
import type { LocalStackParamList } from './LocalNavigator.tsx';
import { useLocalAvailability, type AvailabilityNotice } from './useLocalAvailability.ts';

function NoticeView({ notice, onRetry }: { notice: AvailabilityNotice; onRetry: () => void }) {
  if (notice.kind === 'version-conflict') {
    return <Notice tone="warning" title={accountCopy('version-conflict').title} live>{accountCopy('version-conflict').description}</Notice>;
  }
  const copy = accountCopy(notice.error);
  return (
    <Notice
      tone="danger"
      title={copy.title}
      live
      {...(notice.kind === 'retry' ? { actions: <Button label="Reintentar el mismo cambio" icon="refresh-outline" variant="secondary" onPress={onRetry} /> } : {})}
    >
      {copy.description}
    </Notice>
  );
}

/** Real availability of the signed-in synthetic courier, persisted by the local API. */
export function LocalShiftScreen({ navigation }: NativeStackScreenProps<LocalStackParamList, 'Shift'>) {
  const { theme } = useTheme();
  const { signOut } = useLocalSession();
  const { state, reload, change } = useLocalAvailability();
  const { me, notice, pending } = state;

  if (state.status === 'loading') return <Screen><LoadingState label="Consultando tu perfil en el laboratorio…" /></Screen>;
  if (state.status === 'error' || !me) {
    const copy = accountCopy(state.loadError ?? 'unexpected');
    return (
      <Screen>
        <EmptyState icon="cloud-offline-outline" title={copy.title} description={copy.description} actions={
          <>
            <Button label="Reintentar" icon="refresh-outline" onPress={reload} />
            <Button label="Cerrar sesión" icon="log-out-outline" variant="ghost" onPress={() => signOut()} />
          </>
        } />
      </Screen>
    );
  }

  const target = me.availability.status === 'available' ? 'offline' : 'available';
  const footer = (
    <Button
      label={target === 'available' ? 'Ponerme disponible' : 'Dejar de estar disponible'}
      icon={target === 'available' ? 'power-outline' : 'moon-outline'}
      size="action"
      variant={target === 'available' ? 'accent' : 'primary'}
      pending={pending}
      hint="Guarda tu disponibilidad en el servidor del laboratorio"
      onPress={() => void change(target)}
    />
  );

  return (
    <Screen footer={footer}>
      <AvailabilityCard me={me} />
      {notice && <NoticeView notice={notice} onRetry={() => notice.kind === 'retry' && void change(notice.target)} />}
      <Notice tone="info" title="Estar disponible no asigna entregas">
        El servidor todavía no tiene ofertas, asignaciones ni elegibilidad financiera confirmada. Tu estado se guarda, pero nadie te enviará pedidos.
      </Notice>
      <View style={{ gap: theme.spacing[3], marginTop: theme.spacing[2] }}>
        <AppText variant="heading" heading>Más opciones</AppText>
        <Button label="Actualizar estado" icon="refresh-outline" variant="secondary" disabled={pending} onPress={reload} />
        <Button label="Ofertas y entregas" icon="list-outline" variant="secondary" onPress={() => navigation.navigate('NotConnected')} />
        <ThemeChoice />
        <Button label="Funciones no disponibles" icon="information-circle-outline" variant="secondary" onPress={() => navigation.navigate('Unavailable')} />
        <Button label="Cerrar sesión" icon="log-out-outline" variant="ghost" onPress={() => signOut()} />
      </View>
    </Screen>
  );
}
