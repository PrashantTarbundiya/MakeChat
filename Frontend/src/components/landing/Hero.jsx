import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus } from 'lucide-react';

export const Hero = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, -100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const glowOpacity = useTransform(scrollY, [0, 300], [1, 0.5]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-20">

      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-10 pointer-events-none" />

      <div className="relative z-20 container mx-auto px-4 flex flex-col items-center justify-center h-full">

        {/* Versions / Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute left-4 top-32 hidden md:block"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 tracking-[0.2em]">PLATFORM VER</span>
            <span className="text-xs text-white/80 font-mono">3.0.0_STABLE</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute right-4 top-32 hidden md:block text-right"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 tracking-[0.2em]">SYSTEM STATUS</span>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-2 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              OPERATIONAL
            </span>
          </div>
        </motion.div>

        {/* Central Graphic Container */}
        <div className="relative w-full max-w-5xl aspect-square md:aspect-video flex items-center justify-center">

          {/* The Ring */}
          <motion.div
            style={{ scale, opacity: glowOpacity }}
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full border border-white/5 shadow-[0_0_100px_rgba(16,185,129,0.2)]"
          >
            {/* Orbital elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3 h-3 bg-emerald-500/80 rounded-full shadow-[0_0_20px_#10b981]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-3 h-3 bg-white/50 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-2 h-8 bg-emerald-500/20 rounded-full blur-sm" />
          </motion.div>

          {/* Inner Ring */}
          <motion.div
            style={{ scale, opacity: glowOpacity }}
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] rounded-full border border-dashed border-white/10"
          />

          {/* Main Title */}
          <h1 className="relative z-30 text-center flex flex-col items-center justify-center pointer-events-none select-none mix-blend-difference">
            <motion.span
              style={{ y: y1 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 leading-none mb-2 md:mb-6"
            >
              UNIFIED AI
            </motion.span>
            <motion.span
              style={{ y: y2 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-4xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-t from-white via-white to-white/40 leading-none"
            >
              INTELLIGENCE
            </motion.span>
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-30 text-white/60 text-center max-w-lg mx-auto text-sm md:text-base leading-relaxed mt-[-40px] md:mt-[-100px]"
        >
          Access GPT-4, Claude 3.5, Gemini, and DeepSeek in one powerful interface. The only chat platform you'll ever need.
        </motion.p>

        {/* Mobile CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative z-30 mt-8 md:hidden"
        >
          <button
            onClick={() => navigate('/chat')}
            className="bg-white text-black px-8 py-3 rounded-full text-base font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            START CHATTING <MessageSquarePlus className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Explore The Future</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
        </motion.div>

      </div>
    </section>
  );
};
