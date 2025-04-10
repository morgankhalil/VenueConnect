import React, { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/context/auth-context';
import { Redirect } from 'wouter';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Wait for auth state to be determined
  useEffect(() => {
    if (!isLoading) {
      setCheckingAuth(false);
    }
  }, [isLoading]);
  
  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">VenueConnect Platform</h1>
        <LoginForm />
        <p className="text-center mt-6 text-sm text-muted-foreground">
          For testing use: username = admin, password = password
        </p>
      </div>
    </div>
  );
}