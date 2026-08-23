import React from "react";
import { ArrowRight } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import { useAuth } from '../../hooks/useAuth';

 

export default function Hero() {
  const { isAuthenticated, isLoading, login } = useAuth();

  const handleClick = () => {
    if (!isAuthenticated) {
      login();
    }
    // else: navigate('/dashboard') once that route exists
  };
  return (
    <section className="relative overflow-hidden">
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://www.wits.ac.za/media/wits-university/about-wits/images/Great%20Hall%20landscape%20Chante%20Schatz.jpg')",
        }}
      />
      {/* Navy gradient overlay to match the mock */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/90 via-blue-900/70 to-white" />
 
      <div className="relative z-20 max-w-5xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <Badge>Academic Precision System</Badge>
 
        <h1 className="mt-8 text-4xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl">
          Empowering Academic Excellence through Efficient Tutor Management
        </h1>
 
        <p className="mt-6 text-lg text-blue-50/90 max-w-2xl leading-relaxed">
          A unified platform for organisers, tutors, and volunteers to
          streamline allocations, track hours, and ensure seamless academic
          support across the university.
        </p>
 
        <Button
          variant="primary"
          icon={ArrowRight}
          onClick={handleClick}
          disabled={isLoading}
          className="mt-9 disabled:opacity-60"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In to Portal'}
        </Button>
      </div>
    </section>
  );
}