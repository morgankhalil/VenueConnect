import React, { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from "lucide-react";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Get user data from API
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('/api/user'),
    retry: 3
  });

  // Get connected venues from API
  const { data: connectedVenues = [] } = useQuery({
    queryKey: ['/api/venues/connected'],
    queryFn: () => apiRequest('/api/venues/connected'),
    initialData: []
  });

  if (isLoadingUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (userError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Error loading user data</h2>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No user data available</h2>
          <p className="text-gray-600">Please check your connection</p>
        </div>
      </div>
    );
  }

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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <Sidebar
        userName={user.name}
        venueName={user.venueName}
        userAvatar={user.avatar}
        connectedVenues={connectedVenues}
      />

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72 sm:w-64 border-r shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="space-y-1 p-4">
            {[
              { name: "Dashboard", href: "/" },
              { name: "Calendar", href: "/calendar" },
              { name: "Discover", href: "/discover" },
              { name: "Venue Network", href: "/venue-network" },
              { name: "Messages", href: "/messages" },
              { name: "Settings", href: "/settings" },
            ].map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </nav>
          <Sidebar
            userName={user.name}
            venueName={user.venueName}
            userAvatar={user.avatar}
            connectedVenues={connectedVenues}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header
          onMobileMenuToggle={toggleMobileMenu}
          userAvatar={user.avatar}
          userName={user.name}
          onLogout={handleLogout}
          onSearch={handleSearch}
        />

        {/* Page Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}