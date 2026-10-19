import { View } from 'react-native';
import type { ScreenProps } from '../../navigation/routes.ts';
import { useCourier } from '../../state/CourierProvider.tsx';
import { useTheme } from '../../theme/ThemeProvider.tsx';
import { AppText } from '../../ui/AppText.tsx';
import { Button } from '../../ui/Button.tsx';
import { Card } from '../../ui/Card.tsx';
import { Notice } from '../../ui/Notice.tsx';
import { Screen } from '../../ui/Screen.tsx';
import { EmptyState } from '../../ui/StateViews.tsx';
import { StopBlock } from '../../ui/StopBlock.tsx';
import { OfferActions, OfferTimer } from './OfferCard.tsx';
import { useGoToActiveDelivery } from './useGoToActiveDelivery.ts';

/** Full offer: stops with fictitious addresses and notes, server-simulated expiry and big actions. */
export function OfferDetailScreen({ navigation, route }: ScreenProps<'OfferDetail'>) {
  const { theme } = useTheme();
  const { state } = useCourier();
  const offer = state.inbox.offers.find((item) => item.offerId === route.params.offerId);
  useGoToActiveDelivery();

  if (!offer) {
    return (
      <Screen>
        <EmptyState
          icon="file-tray-outline"
          title="Esta oferta ya no está disponible"
          description="Puede que la hayas respondido o que ya no exista."
          actions={<Button label="Ver ofertas" icon="list-outline" onPress={() => navigation.navigate('Offers')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen footer={<OfferActions offer={offer} />}>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="overline" color="text-secondary">{offer.reference}</AppText>
        <AppText variant="title" heading>{offer.packageNote}</AppText>
        <OfferTimer expiresAt={offer.expiresAt} />
      </View>
      <Card>
        <StopBlock kind="pickup" {...offer.pickup} />
        <StopBlock kind="dropoff" {...offer.dropoff} />
      </Card>
      <Notice tone="info" title="Sin ruta ni tiempo estimado">
        Esta versión no dibuja mapas ni calcula cuánto tardarás. Las direcciones e indicaciones son ficticias.
      </Notice>
    </Screen>
  );
}
