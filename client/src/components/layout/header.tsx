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
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export function Header({ 
  onMobileMenuToggle, 
  userAvatar, 
  userName,
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
    <header className="sticky top-0 z-30 w-full transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/10 overflow-hidden">
          <div className="h-full bg-primary animate-pulse rounded-r-full" style={{ width: '30%' }}></div>
        </div>
      )}

      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden -ml-1 mr-2 p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            onClick={onMobileMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block mr-6">
            <h2 className="text-xl font-medium tracking-tight dark:text-white fade-in">
              Welcome back, <span className="text-primary font-semibold">{userName.split(' ')[0]}</span>
            </h2>
          </div>

          <form 
            className="max-w-md w-full"
            onSubmit={handleSearchSubmit}
          >
            <div className="relative text-gray-400 focus-within:text-gray-600 dark:focus-within:text-gray-400">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4" />
              </div>
              <Input
                id="search"
                className="block w-full pl-10 pr-3 py-2 text-sm border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
            className="relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute top-0 right-0 h-2 w-2 p-0 bg-primary border-white dark:border-gray-900" variant="secondary" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            onClick={() => navigate("/help")}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="gap-2 ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-sm rounded-full focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
              >
                <Avatar className="h-8 w-8 ring-2 ring-gray-100 dark:ring-gray-800">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{userInitial}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block font-medium">{userName.split(' ')[0]}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 p-1">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer py-2"
                onClick={() => navigate("/profile")}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-2"
                onClick={() => navigate("/settings")}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-2"
                onClick={() => navigate("/billing")}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer py-2 text-destructive focus:text-destructive" 
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}