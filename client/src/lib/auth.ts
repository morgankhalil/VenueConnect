/**
 * Auth utilities for the application
 * These functions provide direct logout and navigation capabilities
 * that bypass the regular context API for reliability
 */

import axios from 'axios';

/**
 * Force logout the user by calling the logout API endpoint
 * and then redirecting to the login page
 * 
 * This is a fallback mechanism for when the context logout doesn't work
 */
export async function forceLogout(): Promise<void> {
  try {
    // Try to call the logout API endpoint
    await axios.post('/api/auth/logout');
    
    console.log('Force logout successful, redirecting to login page...');
  } catch (error) {
    console.error('Force logout API call failed:', error);
  } finally {
    // Always redirect to login page, even if API call fails
    window.location.href = '/auth/login';
  }
}