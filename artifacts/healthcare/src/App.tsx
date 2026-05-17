import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AppointmentsPage from "@/pages/appointments";
import DoctorsPage from "@/pages/doctors";
import PatientsPage from "@/pages/patients";
import AiAssistantPage from "@/pages/ai-assistant";
import TenantsPage from "@/pages/tenants";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!token) setLocation("/");
  }, [token, setLocation]);
  if (!token) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/appointments">
        <ProtectedRoute component={AppointmentsPage} />
      </Route>
      <Route path="/doctors">
        <ProtectedRoute component={DoctorsPage} />
      </Route>
      <Route path="/patients">
        <ProtectedRoute component={PatientsPage} />
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute component={AiAssistantPage} />
      </Route>
      <Route path="/tenants">
        <ProtectedRoute component={TenantsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
