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
  Mic2
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
      <div className="flex flex-col w-64 border-r border-gray-200/50 dark:border-gray-800/50 pt-5 pb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        {/* App Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <h1 className="text-2xl font-heading font-bold text-primary flex items-center">
            <Mic2 className="mr-2 h-7 w-7" />
            VenueConnect
          </h1>
        </div>
        
        <div className="mt-8 flex-1 flex flex-col overflow-y-auto px-4">
          {/* User Profile */}
          <div className="mb-8">
            <div className="flex items-center p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
              <div className="flex-shrink-0 h-12 w-12">
                {userAvatar ? (
                  <img 
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30 dark:ring-black/20" 
                    src={userAvatar} 
                    alt={userName} 
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center ring-2 ring-white/30 dark:ring-black/20">
                    <span className="text-primary-foreground font-semibold text-lg">
                      {userName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-4">
                <p className="text-base font-medium">{userName}</p>
                <p className="text-sm text-muted-foreground">{venueName}</p>
              </div>
            </div>
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
                    "group flex items-center px-4 py-2.5 text-base font-medium rounded-lg transition-all duration-200 hover-lift",
                    isActive
                      ? "bg-primary text-primary-foreground dark:bg-primary/90"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                        ? "text-primary-foreground"
                        : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
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
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Venue Network
              </h3>
              <button className="text-accent hover:text-primary transition-colors">
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-1">
              {connectedVenues.length > 0 ? (
                connectedVenues.map((venue) => (
                  <a
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="group flex items-center px-4 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                          ? "bg-accent pulse-accent" 
                          : "bg-gray-400"
                      )}
                    />
                    <span className="truncate">{venue.name}</span>
                  </a>
                ))
              ) : (
                <div className="px-4 py-3 rounded-lg bg-muted/50 text-center border border-accent/20">
                  <Users className="h-5 w-5 mx-auto mb-2 text-accent" />
                  <p className="text-sm text-muted-foreground">
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
