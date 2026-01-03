import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, MessageSquarePlus } from 'lucide-react';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'MODELS', href: '#models' },
    { name: 'FEATURES', href: '#features' },
    { name: 'WORKFLOW', href: '#workflow' },
    { name: 'CONTACT', href: '#contact' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-md py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
             <img 
               src="https://res.cloudinary.com/durcxd0dn/image/upload/v1764748775/cropped_circle_image_no7c6p.png" 
               alt="MakeChat Logo" 
               className="w-10 h-10 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-transform duration-300 group-hover:scale-110"
             />
             <span className="text-xl font-bold tracking-wider text-white">MAKECHAT</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-1 bg-white/5 rounded-full px-6 py-2 border border-white/10 backdrop-blur-sm">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-white/60 hover:text-white text-xs font-medium tracking-widest px-4 py-1 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <button
              onClick={() => navigate('/chat')}
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              START CHATTING <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[60] bg-black flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-12">
              <span className="text-xl font-bold tracking-wider text-white">MAKECHAT</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex flex-col gap-8 items-center">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-light tracking-widest text-white/80 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <button
                onClick={() => {
                  navigate('/chat');
                  setMobileMenuOpen(false);
                }}
                className="mt-8 bg-white text-black px-8 py-3 rounded-full text-lg font-bold w-full"
              >
                START CHATTING
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
