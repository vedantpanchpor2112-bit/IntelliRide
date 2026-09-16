import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell } from '@/components/app-shell';

import { TrackPage } from '@/pages/track';
import { SpeedPage } from '@/pages/speed';
import { AlertsPage } from '@/pages/alerts';
import { ContactsPage } from '@/pages/contacts';
import { FamilyPage } from '@/pages/family';
import { SettingsPage } from '@/pages/settings';
import NotFound from '@/pages/not-found';

import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={TrackPage} />
          <Route path="/speed" component={SpeedPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/contacts" component={ContactsPage} />
          <Route path="/family" component={FamilyPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      {children}
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, '')}
        >
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;