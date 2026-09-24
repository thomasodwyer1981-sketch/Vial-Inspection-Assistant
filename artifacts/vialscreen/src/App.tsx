import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Capacitor } from '@capacitor/core';

import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/context/ThemeContext';
import ClosingScreen, { ClosingNoticeModal } from '@/pages/ClosingScreen';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsScreen from '@/pages/TermsScreen';
import DeleteData from '@/pages/DeleteData';
import { disableAnalytics } from '@/lib/firebaseAnalytics';

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
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsScreen} />
      <Route path="/delete-data" component={DeleteData} />
      <Route component={ClosingScreen} />
    </Switch>
  );
}

function App() {
  const [showClosingNotice, setShowClosingNotice] = useState(
    () => sessionStorage.getItem('pepscan-closing-notice-shown') !== '1',
  );

  useEffect(() => {
    void disableAnalytics();
  }, []);

  const dismissClosingNotice = () => {
    sessionStorage.setItem('pepscan-closing-notice-shown', '1');
    setShowClosingNotice(false);
  };

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <BackButtonHandler />
              <Router />
              {showClosingNotice && <ClosingNoticeModal onDismiss={dismissClosingNotice} />}
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
