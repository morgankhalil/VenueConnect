import React, { useState } from "react";
import { useLocation } from "wouter";
import { 
  Menu, 
  Search as SearchIcon, 
  Bell, 
  ChevronDown,
  User,
  Settings as SettingsIcon,
  CreditCard,
  LogOut,
  HelpCircle
} from "lucide-react";
import { forceLogout } from "@/lib/auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  userAvatar?: string;
  userName: string;
  userRole?: string;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export function Header({ 
  onMobileMenuToggle, 
  userAvatar, 
  userName,
  userRole = "user",
  onLogout, 
  onSearch,
  isLoading = false
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-30 w-full transition-all duration-300 bg-white dark:bg-black backdrop-blur-md border-b border-gray-300 dark:border-gray-800">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-[hsl(var(--custom-grey-light))] overflow-hidden">
          <div className="h-full bg-[hsl(var(--custom-grey-dark))] animate-pulse rounded-r-full" style={{ width: '30%' }}></div>
        </div>
      )}

      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden -ml-1 mr-2 p-1.5 rounded text-[hsl(var(--custom-grey-medium))] hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--custom-grey-light))] dark:focus:ring-[hsl(var(--custom-grey-dark))] transition-colors"
            onClick={onMobileMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          

          <form 
            className="max-w-md w-full"
            onSubmit={handleSearchSubmit}
          >
            <div className="relative text-[hsl(var(--custom-grey-medium))] focus-within:text-black dark:focus-within:text-white">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4" />
              </div>
              <Input
                id="search"
                className="block w-full pl-10 pr-3 py-2 text-sm border-gray-300 dark:border-gray-700 focus:ring-1 focus:ring-[hsl(var(--custom-grey-medium))] placeholder:text-[hsl(var(--custom-grey-medium))]"
                placeholder="Search artists, venues, or events..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button 
            variant="ghost" 
            size="icon"
            className="relative rounded hover:bg-gray-100 dark:hover:bg-gray-900 text-[hsl(var(--custom-grey-medium))] hover:text-black dark:hover:text-white"
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute top-0 right-0 h-2 w-2 p-0 bg-[hsl(var(--custom-grey-dark))] border-white dark:border-black" variant="secondary" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className="rounded hover:bg-gray-100 dark:hover:bg-gray-900 text-[hsl(var(--custom-grey-medium))] hover:text-black dark:hover:text-white"
            onClick={() => navigate("/help")}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 ml-2 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center text-sm rounded focus:ring-1 focus:ring-[hsl(var(--custom-grey-medium))]"
              >
                <Avatar className="h-8 w-8 ring-1 ring-[hsl(var(--custom-grey-light))] dark:ring-[hsl(var(--custom-grey-dark))]">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-[hsl(var(--custom-grey-medium))] text-white">{userInitial}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block font-medium text-black dark:text-white">{userName.split(' ')[0]}</span>
                <ChevronDown className="h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 p-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-black dark:text-white">{userName}</p>
                  <p className="text-xs text-[hsl(var(--custom-grey-medium))]">
                    {userRole === 'admin' ? 'Administrator' : 
                     userRole === 'venueManager' ? 'Venue Manager' : 
                     userRole === 'artist' ? 'Artist' : 'User'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
              <DropdownMenuItem 
                className="cursor-pointer py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => navigate("/profile")}
              >
                <User className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => navigate("/settings")}
              >
                <SettingsIcon className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                onClick={() => navigate("/billing")}
              >
                <CreditCard className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
              <DropdownMenuItem 
                className="cursor-pointer py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // First try the regular logout
                  if (onLogout) {
                    try {
                      onLogout();
                    } catch (error) {
                      console.error("Normal logout failed, trying force logout:", error);
                    }
                  }
                  
                  // Always force logout as a backup
                  setTimeout(() => {
                    forceLogout();
                  }, 100);
                }}
              >
                <LogOut className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}