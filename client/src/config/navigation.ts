
import { 
  LayoutDashboard, 
  Calendar, 
  Compass, 
  Network, 
  MessageSquare, 
  Settings,
  Truck
} from "lucide-react";

export const navigationConfig = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Discover", href: "/discover", icon: Compass },
  { name: "Tours", href: "/tours", icon: Truck },
  { name: "Venue Network", href: "/venue-network", icon: Network },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];
