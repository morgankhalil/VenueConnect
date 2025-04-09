import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import VenueNetwork from "@/pages/venue-network";
import Calendar from "@/pages/calendar";
import Discover from "@/pages/discover";
import Messages from "@/pages/messages";
import Settings from "@/pages/settings";
import VenueDetails from "@/pages/venue-details";
import MapTest from "@/pages/map-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/venue-network" component={VenueNetwork} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/discover" component={Discover} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route path="/venues/:id" component={VenueDetails} />
      <Route path="/map-test" component={MapTest} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Very simple map test directly in browser at /map-test path
  const path = window.location.pathname;
  
  if (path === '/map-test') {
    return <MapTest />;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
