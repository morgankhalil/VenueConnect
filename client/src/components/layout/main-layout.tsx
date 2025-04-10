import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, Mic2 } from "lucide-react";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { theme } = useTheme(); //Corrected order
  const [, navigate] = useLocation(); //Corrected order
  const isMobile = useIsMobile(); //Corrected order
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); //Corrected order
  const [scrolled, setScrolled] = useState(false);
  const queryClient = useQueryClient();

  // Handle scroll effects for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get user data from API with optimized loading and caching
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('/api/user'),
    retry: 1,
    staleTime: Infinity, // Keep user data permanently fresh during session
    // Load from cache immediately while fetching new data in background
    refetchOnMount: "always", // Always fetch on first mount
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false // Don't refetch on reconnect
  });

  // Get connected venues from API with optimized dependencies
  const { data: connectedVenues = [] } = useQuery({
    queryKey: ['/api/venues/connected'],
    queryFn: () => apiRequest('/api/venues/connected'),
    initialData: [],
    enabled: !!user, // Only fetch when user is available
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Default user if still loading, to prevent blocking the UI
  const userToDisplay = user || {
    id: 0,
    name: "Loading...",
    venueName: "Loading...",
    role: "user",
    avatar: null,
    venueId: null
  };

  // Show a loading indicator in the header instead of blocking the entire UI
  const isInitialLoading = isLoadingUser && !user;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Implement search functionality
  };

  const handleLogout = async () => {
    try {
      // Call the logout endpoint
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });

      // Clear any cached data in React Query
      queryClient.clear();

      // Navigate to the login page instead of reloading
      navigate('/auth/login');

      console.log("Logout completed");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar
        userName={userToDisplay.name}
        venueName={userToDisplay.venueName}
        userAvatar={userToDisplay.avatar}
        connectedVenues={connectedVenues}
      />

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 sm:w-72 border-r shadow-lg">
          <div className="flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-800/50">
            <h2 className="text-xl font-heading font-bold text-primary flex items-center">
              <Mic2 className="mr-2 h-6 w-6" />
              VenueConnect
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center p-3 mb-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
              <div className="flex-shrink-0 h-12 w-12">
                {userToDisplay.avatar ? (
                  <img 
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30 dark:ring-black/20" 
                    src={userToDisplay.avatar} 
                    alt={userToDisplay.name} 
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center ring-2 ring-white/30 dark:ring-black/20">
                    <span className="text-primary-foreground font-semibold text-lg">
                      {userToDisplay.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-4">
                <p className="text-base font-medium">{userToDisplay.name}</p>
                <p className="text-sm text-muted-foreground">{userToDisplay.venueName}</p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {[
                { name: "Dashboard", href: "/" },
                { name: "Calendar", href: "/calendar" },
                { name: "Discover", href: "/discover" },
                { name: "Venue Network", href: "/venue-network" },
                { name: "Messages", href: "/messages" },
                { name: "Settings", href: "/settings" },
              ].map((item) => {
                const [location] = useLocation();
                const isActive = item.href === "/" 
                  ? location === "/" 
                  : location.startsWith(item.href);

                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`
                      block px-4 py-2.5 rounded-lg text-base font-medium transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground dark:bg-primary/90'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", item.href);
                      // Trigger wouter's location detection
                      const navEvent = new PopStateEvent('popstate');
                      window.dispatchEvent(navEvent);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header
          onMobileMenuToggle={toggleMobileMenu}
          userAvatar={userToDisplay.avatar}
          userName={userToDisplay.name}
          onLogout={handleLogout}
          onSearch={handleSearch}
          isLoading={isInitialLoading}
        />

        {/* Page Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="fade-in slide-up pb-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}