import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from "../components/LandingPage Components/Navbar";
import Hero from "../components/LandingPage Components/Hero";
import FeatureSection from "../components/LandingPage Components/FeatureSection";
import Footer from "../components/LandingPage Components/Footer";
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    document.title = 'Toodle · Tutor Management';
  }, []);

  // Already signed in → go straight to dashboard
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = () => {
    login();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Navbar />
      <Hero onSignIn={handleSignIn} />
      <FeatureSection />
      <div className="flex-1" />
      <Footer />
    </div>
  );
}