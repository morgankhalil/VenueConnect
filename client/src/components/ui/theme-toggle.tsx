import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/ui/theme-provider"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded hover:bg-gray-100 dark:hover:bg-gray-900 text-[hsl(var(--custom-grey-medium))] hover:text-black dark:hover:text-white">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700">
        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900">
          <Sun className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900">
          <Moon className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900">
          <Monitor className="mr-2 h-4 w-4 text-[hsl(var(--custom-grey-medium))]" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}