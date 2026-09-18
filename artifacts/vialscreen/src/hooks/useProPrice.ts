import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getProPrice } from '@/utils/revenuecat';

/**
 * Returns the store-formatted price string from RevenueCat on native
 * (for example, a localized currency string). It must not show a hardcoded
 * price while the store offering is unavailable.
 */
export function useProPrice(): string | null {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    getProPrice().then((p) => {
      if (p) setPrice(p);
    });
  }, []);

  return price;
}
