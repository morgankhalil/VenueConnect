import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/context/auth-context";
import { MainLayout } from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import VenueNetwork from "@/pages/venue-network";
import Calendar from "@/pages/calendar";
import Discover from "@/pages/discover";
import Venues from "@/pages/venues";
import Messages from "@/pages/messages";
import Settings from "@/pages/settings";
import AdminSettings from "@/pages/admin/settings";
import VenueDetails from "@/pages/venue-details";
import EventDetails from "@/pages/event-details";
import MapTest from "@/pages/map-test";
import NotFound from "@/pages/not-found";
import Documentation from "@/pages/documentation";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
// Tour management pages
import Tours from "@/pages/tours";
import TourDetail from "@/pages/tour-detail";
import NewTour from "@/pages/tour-new";
import EditTour from "@/pages/tour-edit";
import OptimizeTour from "@/pages/tour-optimize";
import TourWizard from "@/pages/tour-wizard";
// AI enhancement page
import AIEnhancementPage from "./pages/AIEnhancementPage";
import DataSeedingPage from "@/pages/admin/data-seeding"; // Import the DataSeedingPage component


function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/venue-network" component={VenueNetwork} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/discover" component={Discover} />
      <Route path="/venues" component={Venues} />
      <Route path="/messages" component={Messages} />
      <Route path="/settings" component={Settings} />
      <Route path="/venues/:id" component={VenueDetails} />
      <Route path="/event/:id" component={EventDetails} />
      <Route path="/map-test" component={MapTest} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/data-seeding" component={DataSeedingPage} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />

      {/* Tour management routes */}
      <Route path="/tours" component={Tours} />
      <Route path="/tours/new" component={NewTour} />
      <Route path="/tours/:id/edit" component={EditTour} />
      <Route path="/tours/:id/optimize" component={OptimizeTour} />
      <Route path="/tours/:id/wizard" component={TourWizard} />
      <Route path="/tours/:id" component={TourDetail} />
      <Route path="/documentation" component={Documentation} />

      {/* AI Enhancement routes */}
      <Route path="/ai-enhancement" component={AIEnhancementPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();

  // Handle auth pages and main app layout
  const isAuthPage = location.startsWith('/auth/');
  const isMapTestPage = location === '/map-test';

  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {isAuthPage ? (
            <Router />
          ) : isMapTestPage ? (
            <MainLayout hideNav>
              <MapTest />
            </MainLayout>
          ) : (
            <MainLayout>
              <Router />
            </MainLayout>
          )}
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;