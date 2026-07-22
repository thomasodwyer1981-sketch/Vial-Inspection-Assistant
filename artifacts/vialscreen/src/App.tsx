import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

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
import UpgradeScreen from '@/pages/UpgradeScreen';
import UpgradeCompleteScreen from '@/pages/UpgradeCompleteScreen';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import DeleteData from '@/pages/DeleteData';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

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
      <Route path="/upgrade" component={UpgradeScreen} />
      <Route path="/upgrade-complete" component={UpgradeCompleteScreen} />
      <Route path="/privacy" component={PrivacyPolicy} />
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
