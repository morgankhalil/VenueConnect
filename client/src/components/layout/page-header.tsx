import React from 'react';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  backLink?: string;
  backLinkText?: string;
}

export function PageHeader({ 
  title, 
  description, 
  icon, 
  backLink, 
  backLinkText = 'Back'
}: PageHeaderProps) {
  return (
    <div className="flex flex-col space-y-2">
      {backLink && (
        <Link href={backLink}>
          <div className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {backLinkText}
          </div>
        </Link>
      )}

      <div className="flex items-center">
        {icon && (
          <div className="mr-3 p-1.5 bg-primary/10 rounded-md">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-gray-600 dark:text-gray-300">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}