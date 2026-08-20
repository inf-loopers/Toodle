import React from "react";
import Navbar from "../components/LandingPage Components/Navbar";
import Hero from "../components/LandingPage Components/Hero";
import FeatureSection from "../components/LandingPage Components/FeatureSection";
import Footer from "../components/LandingPage Components/Footer";

export default function LandingPage() {
  const handleSignIn = () => {
    // Wire this up to your auth route, e.g. navigate("/login")
    console.log("Sign in to portal clicked");
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