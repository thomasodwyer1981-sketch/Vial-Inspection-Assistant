import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getProPrice } from '@/utils/revenuecat';
import { PRO_PRICE_DISPLAY } from '@/utils/pro';

/**
 * Returns the store-formatted price string from RevenueCat on native
 * (e.g. "$4.99" or "€4.99"). Native returns null until the store offering
 * is available; it must not show a hardcoded price in place of the store price.
 */
export function useProPrice(): string | null {
  const [price, setPrice] = useState<string | null>(
    Capacitor.isNativePlatform() ? null : PRO_PRICE_DISPLAY,
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    getProPrice().then((p) => {
      if (p) setPrice(p);
    });
  }, []);

  return price;
}
