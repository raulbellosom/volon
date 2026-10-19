import { Pressable, View } from 'react-native';
import type { CourierOffer } from '../../domain/courier.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { Button } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Notice } from '../../ui/Notice.tsx';
import { StatusPill } from '../../ui/StatusPill.tsx';
import { StopBlock } from '../../ui/StopBlock.tsx';
import { errorCopy } from '../shared/error-copy.ts';
import { formatCountdown, useOfferCountdown } from './useOfferCountdown.ts';

/** Expiry pill: the countdown comes from the simulated server and is labeled as such. */
export function OfferTimer({ expiresAt }: { expiresAt: string }) {
  const seconds = useOfferCountdown(expiresAt);
  return seconds > 0
    ? <StatusPill label={`Vence en ${formatCountdown(seconds)}`} tone={seconds <= 30 ? 'warning' : 'info'} icon="timer-outline" />
    : <StatusPill label="Oferta vencida" tone="danger" icon="close-circle-outline" />;
}

/**
 * Accept and decline as real buttons (never only a swipe), blocked once expired or in flight.
 * Screens move to the delivery when the gateway confirms it, never optimistically.
 */
export function OfferActions({ offer }: { offer: CourierOffer }) {
  const { theme } = useTheme();
  const { state, actions } = useCourier();
  const seconds = useOfferCountdown(offer.expiresAt);
  const command = state.commands[offer.offerId];
  const error = state.offerErrors[offer.offerId];
  const settled = error === 'conflict' || error === 'offer-expired' || error === 'not-found';
  const blocked = seconds === 0 || settled || Boolean(command);

  return (
    <View style={{ gap: theme.spacing[3] }}>
      {error && <Notice tone={settled ? 'warning' : 'danger'} title={errorCopy(error).title} live>{errorCopy(error).description}</Notice>}
      <Button
        label={error === 'offline' || error === 'unavailable' ? 'Reintentar aceptar' : 'Aceptar oferta'}
        icon="checkmark-circle-outline"
        size="action"
        variant="accent"
        hint={`Acepta la entrega ${offer.reference}`}
        pending={command === 'accept'}
        disabled={blocked && command !== 'accept'}
        onPress={() => void actions.respond(offer.offerId, 'accept')}
      />
      <Button
        label="Rechazar"
        icon="close-outline"
        variant="ghost"
        hint={`Rechaza la entrega ${offer.reference}`}
        pending={command === 'decline'}
        disabled={blocked && command !== 'decline'}
        onPress={() => void actions.respond(offer.offerId, 'decline')}
      />
    </View>
  );
}

/** One offer in the inbox: what to pick up, where it goes and how long is left. */
export function OfferCard({ offer, onOpen }: { offer: CourierOffer; onOpen: () => void }) {
  const { theme } = useTheme();
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Oferta ${offer.reference}: de ${offer.pickup.title} a ${offer.dropoff.title}. Ver detalle`}
        onPress={onOpen}
        style={{ gap: theme.spacing[3] }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing[2] }}>
          <AppText variant="overline" color="text-secondary">{offer.reference} · {offer.packageNote}</AppText>
          <OfferTimer expiresAt={offer.expiresAt} />
        </View>
        <StopBlock kind="pickup" title={offer.pickup.title} addressLine={offer.pickup.addressLine} compact />
        <StopBlock kind="dropoff" title={offer.dropoff.title} addressLine={offer.dropoff.addressLine} compact />
      </Pressable>
      <OfferActions offer={offer} />
    </Card>
  );
}
