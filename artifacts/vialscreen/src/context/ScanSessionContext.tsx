/**
 * ScanSessionContext — shares a single useScanSession instance across
 * ScanScreen and all its step sub-components.
 *
 * Without this, every component that calls useScanSession() gets its own
 * isolated React state, so startNewSession() called in ScanScreen never
 * populates the session seen by PrepareStep, CaptureStep, etc.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useScanSession, type UseScanSession } from '@/hooks/useScanSession';

const ScanSessionContext = createContext<UseScanSession | null>(null);

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const value = useScanSession();
  return <ScanSessionContext.Provider value={value}>{children}</ScanSessionContext.Provider>;
}

export function useScanSessionContext(): UseScanSession {
  const ctx = useContext(ScanSessionContext);
  if (!ctx) throw new Error('useScanSessionContext must be used within <ScanSessionProvider>');
  return ctx;
}
