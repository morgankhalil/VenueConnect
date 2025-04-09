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
  MusicIcon
} from "lucide-react";

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
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Discover", href: "/discover", icon: Compass },
    { name: "Venue Network", href: "/venue-network", icon: Network },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 pt-5 pb-4 bg-white">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-heading font-bold text-primary-800 flex items-center">
            <MusicIcon className="mr-2" />
            VenueConnect
          </h1>
        </div>
        <div className="mt-6 h-0 flex-1 flex flex-col overflow-y-auto">
          {/* User Profile */}
          <div className="px-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                {userAvatar ? (
                  <img 
                    className="h-10 w-10 rounded-full object-cover" 
                    src={userAvatar} 
                    alt={userName} 
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-800 font-semibold">
                      {userName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{userName}</p>
                <p className="text-xs font-medium text-gray-500">{venueName}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="px-3 space-y-1">
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
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    isActive
                      ? "bg-primary-50 text-primary-800"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                        ? "text-primary-500"
                        : "text-gray-400"
                    )}
                  />
                  {item.name}
                </a>
              );
            })}
          </nav>
          
          {/* Venue Network Connections */}
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Venue Network
            </h3>
            <div className="mt-1 space-y-1 px-3">
              {connectedVenues.map((venue) => (
                <a
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                      "w-2 h-2 mr-3 rounded-full",
                      venue.isOnline ? "bg-green-400" : "bg-gray-400"
                    )}
                  />
                  {venue.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
