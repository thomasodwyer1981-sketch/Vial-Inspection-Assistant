import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Capacitor } from '@capacitor/core';

import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/context/ThemeContext';
import OnboardingGate from '@/pages/OnboardingGate';
import OnboardingScreen from '@/pages/OnboardingScreen';
import HomeScreen from '@/pages/HomeScreen';
import SetupScreen from '@/pages/SetupScreen';
import ScanScreen from '@/pages/ScanScreen';
import HistoryScreen from '@/pages/HistoryScreen';
import HistoryDetailScreen from '@/pages/HistoryDetailScreen';
import LimitationsScreen from '@/pages/LimitationsScreen';
import CalculatorScreen from '@/pages/CalculatorScreen';
import UpgradeScreen from '@/pages/UpgradeScreen';
import UpgradeCompleteScreen from '@/pages/UpgradeCompleteScreen';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsScreen from '@/pages/TermsScreen';
import DeleteData from '@/pages/DeleteData';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

/** Handles Android hardware back button — navigate back or minimise to background. */
function BackButtonHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removed = false;
    let removeHandle: (() => void) | null = null;

    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.minimizeApp();
        }
      }).then(handle => {
        // If the component already unmounted before the Promise resolved, remove immediately
        if (removed) {
          handle.remove();
        } else {
          removeHandle = () => handle.remove();
        }
      });
    });

    return () => {
      removed = true;
      removeHandle?.();
    };
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={OnboardingGate} />
      <Route path="/onboarding" component={OnboardingScreen} />
      <Route path="/home" component={HomeScreen} />
      <Route path="/setup" component={SetupScreen} />
      <Route path="/scan" component={ScanScreen} />
      <Route path="/history" component={HistoryScreen} />
      <Route path="/history/:id" component={HistoryDetailScreen} />
      <Route path="/limitations" component={LimitationsScreen} />
      <Route path="/calculator" component={CalculatorScreen} />
      <Route path="/upgrade" component={UpgradeScreen} />
      <Route path="/upgrade-complete" component={UpgradeCompleteScreen} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsScreen} />
      <Route path="/delete-data" component={DeleteData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <BackButtonHandler />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
