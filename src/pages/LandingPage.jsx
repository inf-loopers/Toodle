import { Navigate, useLocation } from 'react-router-dom';
import LandingNavbar from '../components/LandingPage Components/LandingNavbar';
import Hero from '../components/LandingPage Components/Hero';
import LandingFooter from '../components/LandingPage Components/LandingFooter';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (!isLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-slate-900 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100 md:h-screen md:overflow-hidden">
      <LandingNavbar />
      <Hero />
      <LandingFooter />
    </main>
  );
}
