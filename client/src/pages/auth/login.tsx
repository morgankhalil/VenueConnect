import React from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/context/auth-context';
import { Redirect } from 'wouter';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Redirect to dashboard if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">VenueConnect Platform</h1>
        <LoginForm />
      </div>
    </div>
  );
}