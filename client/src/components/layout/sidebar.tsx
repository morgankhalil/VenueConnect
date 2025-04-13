import React from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Compass, 
  Network, 
  MessageSquare, 
  Settings, 
  MusicIcon,
  Users,
  PlusCircle,
  Mic2,
  Truck,
  ChevronDown,
  Building,
  BrainCircuit
} from "lucide-react";
import { VenueSelector } from "@/components/venue-selector";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  userName: string;
  venueName: string;
  userAvatar?: string;
  connectedVenues: Array<{
    id: number;
    name: string;
    isOnline: boolean;
  }>;
}

export function Sidebar({ 
  userName, 
  venueName, 
  userAvatar, 
  connectedVenues 
}: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Tours", href: "/tours", icon: Truck },
    { name: "Venues", href: "/venues", icon: Building },
    { name: "Venue Network", href: "/venue-network", icon: Network },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Discover", href: "/discover", icon: Compass },
    { name: "AI Enhancement", href: "/ai-enhancement", icon: BrainCircuit },
  ];

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-300 dark:border-gray-800 pt-5 pb-4 bg-white dark:bg-black backdrop-blur-sm">
        {/* App Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <h1 className="text-2xl font-heading font-bold text-black dark:text-white flex items-center">
            <Mic2 className="mr-2 h-7 w-7 text-[hsl(var(--custom-grey-medium))]" />
            VenueConnect
          </h1>
        </div>
        
        <div className="mt-8 flex-1 flex flex-col overflow-y-auto px-4">
          <div className="px-4 py-2 mb-6">
            <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">
              Venue Discovery Platform
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tour Optimization Demo
            </p>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = (
                item.href === "/" 
                  ? location === "/" 
                  : location.startsWith(item.href)
              );
              
              return (
                <a 
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-4 py-2.5 text-base font-medium rounded transition-all duration-200",
                    isActive
                      ? "bg-[hsl(var(--custom-grey-light))] dark:bg-[hsl(var(--custom-grey-dark))] text-black dark:text-white"
                      : "text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, "", item.href);
                    // Trigger wouter's location detection
                    const navEvent = new PopStateEvent('popstate');
                    window.dispatchEvent(navEvent);
                  }}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive
                        ? "text-black dark:text-white"
                        : "text-[hsl(var(--custom-grey-medium))] group-hover:text-black dark:group-hover:text-white"
                    )}
                  />
                  {item.name}
                </a>
              );
            })}
          </nav>
          
          {/* Venue Network Connections */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4 px-4">
              <h3 className="text-sm font-semibold text-black dark:text-white">
                Venue Network
              </h3>
              <button className="text-[hsl(var(--custom-grey-medium))] hover:text-black dark:hover:text-white transition-colors">
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-1">
              {connectedVenues.length > 0 ? (
                connectedVenues.map((venue) => (
                  <a
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="group flex items-center px-4 py-2 text-sm rounded text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, "", `/venues/${venue.id}`);
                      // Trigger wouter's location detection
                      const navEvent = new PopStateEvent('popstate');
                      window.dispatchEvent(navEvent);
                    }}
                  >
                    <span 
                      className={cn(
                        "w-2.5 h-2.5 mr-3 rounded-full",
                        venue.isOnline 
                          ? "bg-[hsl(var(--custom-grey-medium))]" 
                          : "bg-[hsl(var(--custom-grey-light))]"
                      )}
                    />
                    <span className="truncate">{venue.name}</span>
                  </a>
                ))
              ) : (
                <div className="px-4 py-3 rounded bg-white dark:bg-black text-center border border-[hsl(var(--custom-grey-light))] dark:border-[hsl(var(--custom-grey-dark))]">
                  <Users className="h-5 w-5 mx-auto mb-2 text-[hsl(var(--custom-grey-medium))]" />
                  <p className="text-sm text-[hsl(var(--custom-grey-medium))]">
                    No connected venues yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* App Version */}
        <div className="mt-auto pt-4 px-6 pb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            VenueConnect v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
