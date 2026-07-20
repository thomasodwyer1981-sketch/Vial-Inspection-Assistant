import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { getOnboardingState } from '@/utils/storage';

export default function OnboardingGate() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const { completed } = getOnboardingState();
    if (completed) {
      setLocation('/home');
    } else {
      setLocation('/onboarding');
    }
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
    </div>
  );
}
