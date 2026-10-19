import { View } from 'react-native';
import type { CourierMeResponse } from '../ports/courier-account.ts';
import { useTheme } from '../theme/ThemeProvider.tsx';
import { AppText } from '../ui/AppText.tsx';
import { Card } from '../ui/Card.tsx';
import { StatusPill } from '../ui/StatusPill.tsx';

const SERVER_TIME = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Mexico_City' });

function Fact({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ gap: theme.spacing[0.5] }}>
      <AppText variant="caption" color="text-secondary">{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

/** Only what the API authorizes: opaque courier id, status, version and the server change time. */
export function AvailabilityCard({ me }: { me: CourierMeResponse }) {
  const { theme } = useTheme();
  const available = me.availability.status === 'available';
  return (
    <Card>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="overline" color="text-secondary">Estado guardado en el servidor</AppText>
        <AppText variant="title" heading>{available ? 'Disponible' : 'No disponible'}</AppText>
        <StatusPill label={available ? 'Disponible en el laboratorio' : 'Fuera de turno en el laboratorio'} tone={available ? 'success' : 'neutral'} icon={available ? 'radio-button-on-outline' : 'moon-outline'} />
      </View>
      <View style={{ gap: theme.spacing[3] }}>
        <Fact label="Identificador de repartidor" value={me.courierId} />
        <Fact label="Versión" value={String(me.availability.version)} />
        <Fact label="Último cambio (hora del servidor)" value={SERVER_TIME.format(new Date(me.availability.changedAt))} />
      </View>
    </Card>
  );
}
