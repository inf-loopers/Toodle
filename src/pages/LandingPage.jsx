import Navbar from "../components/LandingPage Components/Navbar";
import Hero from "../components/LandingPage Components/Hero";
import FeatureSection from "../components/LandingPage Components/FeatureSection";
import Footer from "../components/LandingPage Components/Footer";

export default function LandingPage() {


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