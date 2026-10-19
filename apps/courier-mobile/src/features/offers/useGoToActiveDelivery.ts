import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import type { RootStackParamList } from '../../navigation/routes.ts';
import { useCourier } from '../../state/CourierProvider.tsx';

/**
 * Opens the delivery screen once an acceptance is confirmed (a new assignment appears). Only the
 * focused screen navigates, so the list and the detail never both push it.
 */
export function useGoToActiveDelivery() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { state } = useCourier();
  const assignmentId = state.active?.assignmentId ?? null;
  const seen = useRef(assignmentId);

  useEffect(() => {
    if (assignmentId && assignmentId !== seen.current && navigation.isFocused()) navigation.navigate('Delivery');
    seen.current = assignmentId;
  }, [assignmentId, navigation]);
}
