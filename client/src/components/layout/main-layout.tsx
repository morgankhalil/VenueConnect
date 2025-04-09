import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mock user data - in a real app, this would come from authentication
  const user = {
    name: "Alex Johnson",
    venueName: "The Echo Lounge",
    avatar: undefined // Add avatar URL here if available
  };

  // Mock connected venues - in a real app, this would come from API
  const connectedVenues = [
    { id: 1, name: "The Fillmore", isOnline: true },
    { id: 2, name: "The Wiltern", isOnline: true },
    { id: 3, name: "9:30 Club", isOnline: false }
  ];

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
        <SheetContent side="left" className="p-0 w-72 sm:w-64 border-r shadow-lg overflow-y-auto">
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
