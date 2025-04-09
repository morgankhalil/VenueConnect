import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from "lucide-react";

import { useQuery } from '@tanstack/react-query';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user data from API
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: () => apiRequest('GET', '/api/user').then(res => res.json())
  });

  // Get connected venues from API
  const { data: connectedVenues } = useQuery({
    queryKey: ['/api/venues/connected'],
    queryFn: () => apiRequest('GET', '/api/venues/connected').then(res => res.json()),
    initialData: []
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // Implement search functionality
  };

  const handleLogout = () => {
    console.log("Logging out");
    // Implement logout functionality
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
