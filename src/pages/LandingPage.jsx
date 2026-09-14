import { Navigate, useLocation } from 'react-router-dom';
import LandingNavbar from '../components/LandingPage Components/LandingNavbar';
import Hero from '../components/LandingPage Components/Hero';
import FeatureSection from '../components/LandingPage Components/FeatureSection';
import LandingFooter from '../components/LandingPage Components/LandingFooter';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Authenticated users should not sit on the landing page — send them
  // to the page they originally tried to reach, or /dashboard by default.
  if (!isLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <LandingNavbar />
      <Hero />
      <FeatureSection />
      <div className="flex-1" />
      <LandingFooter />
    </div>
  );
}
