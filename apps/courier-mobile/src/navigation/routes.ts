import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Offers: undefined;
  OfferDetail: { offerId: string };
  Delivery: undefined;
  Unavailable: undefined;
  DemoControls: undefined;
};

export type ScreenProps<Name extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, Name>;
