import { useEffect, useState } from 'react';
import { useCourier } from '../../state/CourierProvider.tsx';

/**
 * Seconds left before the offer expires, measured against the (simulated) server clock:
 * the device time is corrected by the offset captured when the inbox arrived.
 */
export function useOfferCountdown(expiresAt: string): number {
  const { state, now } = useCourier();
  const offset = state.inbox.serverOffsetMs;
  const remaining = () => Math.max(0, Math.ceil((Date.parse(expiresAt) - (now() + offset)) / 1000));
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    setSeconds(remaining());
    const timer = setInterval(() => {
      const left = remaining();
      setSeconds(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // `remaining` reads the latest props; restarting on these values is intended.
  }, [expiresAt, offset, now]);

  return seconds;
}

/** «1:05» */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
