import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import type { ScreenProps } from '../../navigation/routes.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { Button } from '../../ui/Button.tsx';
import { Screen } from '../../ui/Screen.tsx';
import { EmptyState, LoadingState } from '../../ui/StateViews.tsx';
import { errorCopy } from '../shared/error-copy.ts';
import { OfferCard } from './OfferCard.tsx';
import { useGoToActiveDelivery } from './useGoToActiveDelivery.ts';

/** Inbox of synthetic offers. Nothing here reads or assigns real deliveries. */
export function OffersScreen({ navigation }: ScreenProps<'Offers'>) {
  const { state, actions } = useCourier();
  const { inbox, shift } = state;
  useGoToActiveDelivery();

  // Refresh every time the inbox comes into view: offers expire and change while you are away.
  useFocusEffect(useCallback(() => {
    if (shift === 'available') void actions.loadOffers();
  }, [shift, actions]));

  const refresh = <Button label="Actualizar ofertas" icon="refresh-outline" variant="secondary" pending={inbox.status === 'loading'} onPress={() => void actions.loadOffers()} />;

  if (shift !== 'available') {
    return (
      <Screen>
        <EmptyState
          icon={shift === 'busy' ? 'bicycle-outline' : 'moon-outline'}
          title={shift === 'busy' ? 'Termina tu entrega en curso' : 'Activa tu disponibilidad'}
          description={shift === 'busy' ? 'Recibirás nuevas ofertas cuando completes la entrega actual.' : 'Solo recibes ofertas mientras estás disponible.'}
          actions={<Button label="Ir a mi turno" icon="home-outline" onPress={() => navigation.navigate('Home')} />}
        />
      </Screen>
    );
  }

  if (inbox.status === 'loading' && inbox.offers.length === 0) return <Screen><LoadingState label="Buscando ofertas…" /></Screen>;

  if (inbox.status === 'error' && inbox.error) {
    const copy = errorCopy(inbox.error);
    return (
      <Screen>
        <EmptyState icon={inbox.error === 'offline' ? 'cloud-offline-outline' : 'alert-circle-outline'} title={copy.title} description={copy.description} actions={refresh} />
      </Screen>
    );
  }

  if (inbox.offers.length === 0) {
    return (
      <Screen>
        <EmptyState icon="file-tray-outline" title="Sin ofertas por ahora" description="Cuando haya una entrega cerca, aparecerá aquí." actions={refresh} />
      </Screen>
    );
  }

  return (
    <Screen footer={refresh}>
      <AppText variant="caption" color="text-secondary">
        Ofertas ficticias. El tiempo para responder lo marca un servidor simulado.
      </AppText>
      {inbox.offers.map((offer) => (
        <OfferCard key={offer.offerId} offer={offer} onOpen={() => navigation.navigate('OfferDetail', { offerId: offer.offerId })} />
      ))}
    </Screen>
  );
}
