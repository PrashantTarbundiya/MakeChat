import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Footer } from '../components/landing/Footer';
import { LogoTicker } from '../components/landing/LogoTicker';
import { Stats } from '../components/landing/Stats';
import { GrowthProtocol } from '../components/landing/GrowthProtocol';
import { Outputs } from '../components/landing/Outputs';
import { FAQ } from '../components/landing/FAQ';

import { SmoothScroll } from '../components/landing/SmoothScroll';
import { Spotlight } from '../components/landing/Spotlight';
import { AnimatePresence } from 'framer-motion';

const LandingPage = () => {
  return (
    <>
      <SmoothScroll>
        <div className="bg-black text-white min-h-screen selection:bg-emerald-500/30 font-inter">
          <Spotlight />
          <Navbar />
          <Hero />
          <Stats />
          <LogoTicker />
          <Features /> 
          <GrowthProtocol />
          <FAQ />
          <Outputs />
          <Footer />
        </div>
      </SmoothScroll>
    </>
  );
};

export default LandingPage;
