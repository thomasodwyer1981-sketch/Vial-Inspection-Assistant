import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getProPrice } from '@/utils/revenuecat';
import { PRO_PRICE_DISPLAY } from '@/utils/pro';

/**
 * Returns the store-formatted price string from RevenueCat on native
 * (e.g. "$4.99" or "€4.99") falling back to the static PRO_PRICE_DISPLAY
 * constant on web or when the offering cannot be fetched.
 */
export function useProPrice(): string {
  const [price, setPrice] = useState<string>(PRO_PRICE_DISPLAY);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    getProPrice().then((p) => {
      if (p) setPrice(p);
    });
  }, []);

  return price;
}
