/**
 * @file LoginPage.jsx
 * @description Public authentication entry point.
 *
 * Users start here from the landing page or a protected-route redirect. The
 * button opens Auth0 Universal Login, where they can sign in or create an
 * account. After Auth0 returns, the backend syncs the user profile and the
 * onboarding gate decides whether a first-time student must complete setup.
 *
 * Route: `/login`
 */

import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import WelcomeSignIn from '../components/auth/WelcomeSignIn';
import WelcomeIntro from '../components/auth/WelcomeIntro';
import LandingFooter from '../components/LandingPage Components/LandingFooter';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Sign in or sign up - Toodle';
  }, []);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  return (
    <WelcomeIntro footer={<LandingFooter />}>
      <h1 className="sr-only">Sign in</h1>
      <WelcomeSignIn />
    </WelcomeIntro>
  );
}

export default LoginPage;
