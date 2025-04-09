import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MusicIcon, CheckIcon } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.terms) {
      toast({
        title: "Terms required",
        description: "You must agree to the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // In a real app, this would send the data to the server
      // This is just a demo, so we'll simulate success after a short delay
      setTimeout(() => {
        toast({
          title: "Account created",
          description: "Your account has been successfully created.",
          action: (
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckIcon className="h-5 w-5 text-white" />
            </div>
          ),
        });
        
        // Redirect to login page
        navigate("/auth/login");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "There was a problem creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-primary-100 p-3">
            <MusicIcon className="h-8 w-8 text-primary-800" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the VenueConnect network
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name"
                    placeholder="Enter your name" 
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    name="email"
                    type="email" 
                    placeholder="Enter your email" 
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    name="password"
                    type="password" 
                    placeholder="Create a password" 
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters long
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword"
                    type="password" 
                    placeholder="Confirm your password" 
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox 
                  id="terms" 
                  name="terms"
                  checked={formData.terms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, terms: checked as boolean }))
                  }
                  required
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{" "}
                  <Button variant="link" className="p-0 h-auto text-sm font-normal" type="button">
                    terms of service
                  </Button>
                  {" "}and{" "}
                  <Button variant="link" className="p-0 h-auto text-sm font-normal" type="button">
                    privacy policy
                  </Button>
                </label>
              </div>
              
              <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t p-4">
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account?</span>{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm font-normal"
                onClick={() => navigate("/auth/login")}
                type="button"
              >
                Sign in
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}