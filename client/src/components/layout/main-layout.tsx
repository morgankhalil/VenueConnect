import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, Mic2, LayoutDashboard, Truck, Network, Calendar, Compass, MessageSquare, Settings, BrainCircuit, Building } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/auth-context";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MainLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Handle scroll effects for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Demo mode: use hardcoded data for demo purposes
  const demoUser = {
    id: 1,
    name: "Demo User",
    role: "admin",
    avatar: undefined
  };
  
  const demoVenue = {
    id: 1,
    name: "The Fillmore",
  };
  
  // Mock venue connections for the demo
  const connectedVenues = [
    { id: 2, name: "Bowery Ballroom", isOnline: true },
    { id: 3, name: "9:30 Club", isOnline: false },
    { id: 4, name: "The Troubadour", isOnline: true }
  ];
  
  // Default user values for demo
  const userToDisplay = {
    id: demoUser.id,
    name: demoUser.name,
    venueName: demoVenue.name,
    role: demoUser.role,
    avatar: demoUser.avatar,
    venueId: demoVenue.id
  };

  // Simple state for demo
  const [isLoading, setIsLoading] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Implement search functionality
  };

  const { logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      console.log("Starting logout process...");
      // First, clear all cached data to prevent stale data
      queryClient.clear();
      
      // Then call the logout endpoint
      await logout();
      
      console.log("Logout completed, redirecting to login page");
      
      // Force navigation to login page (backup in case the context's redirect doesn't work)
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 100);
    } catch (error) {
      console.error("Error logging out:", error);
      // Even if error, try to redirect to login page
      window.location.href = "/auth/login";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar - Hidden when hideNav is true */}
      {!hideNav && (
        <Sidebar
          userName={userToDisplay.name}
          venueName={userToDisplay.venueName}
          userAvatar={userToDisplay.avatar}
          connectedVenues={connectedVenues}
        />
      )}

      {/* Mobile Sidebar - Hidden when hideNav is true */}
      {!hideNav && (
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
                  { name: "Dashboard", href: "/", icon: LayoutDashboard },
                  { name: "Tours", href: "/tours", icon: Truck },
                  { name: "Venues", href: "/venues", icon: Building },
                  { name: "Venue Network", href: "/venue-network", icon: Network },
                  { name: "Calendar", href: "/calendar", icon: Calendar },
                  { name: "Discover", href: "/discover", icon: Compass },
                  { name: "AI Enhancement", href: "/ai-enhancement", icon: BrainCircuit },
                  { name: "Messages", href: "/messages", icon: MessageSquare },
                  { name: "Settings", href: "/settings", icon: Settings },
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
      )}

      {/* Main Content */}
      <div className={`flex flex-col ${hideNav ? 'w-full' : 'w-0 flex-1'} overflow-hidden`}>
        {!hideNav && (
          <Header
            onMobileMenuToggle={toggleMobileMenu}
            userAvatar={userToDisplay.avatar}
            userName={userToDisplay.name}
            userRole={userToDisplay.role}
            onLogout={handleLogout}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        )}

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