import { useEffect, useState } from 'react';

/** Whole seconds left until `deadline` (ISO), ticking every second; 0 once it passes. */
export function useCountdown(deadline: string | null, now: () => number = Date.now): number {
  const remaining = () => (deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    setSeconds(remaining());
    if (!deadline) return;
    const timer = setInterval(() => {
      const left = remaining();
      setSeconds(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // `remaining` reads the latest `deadline`; restarting on `deadline` alone is intended.
  }, [deadline]);

  return seconds;
}

/** «4:05» for a countdown label. */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
