import { Navigate, useLocation } from 'react-router-dom';
import Navbar from '../components/LandingPage Components/Navbar';
import Hero from '../components/LandingPage Components/Hero';
import FeatureSection from '../components/LandingPage Components/FeatureSection';
import Footer from '../components/LandingPage Components/Footer';
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
      <Navbar />
      <Hero />
      <FeatureSection />
      <div className="flex-1" />
      <Footer />
    </div>
  );
}
