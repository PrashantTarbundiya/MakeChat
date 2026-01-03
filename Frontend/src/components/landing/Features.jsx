import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, MessageCircle } from 'lucide-react';

import { useMotionValue, useSpring, useTransform } from 'framer-motion';

const FeatureCard = ({ title, description, icon: Icon, delay, className = "" }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-colors perspective-1000 ${className}`}
    >
      <div 
        style={{ transform: "translateZ(50px)" }} 
        className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" 
      />
      <div style={{ transform: "translateZ(20px)" }} className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Icon size={24} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-white/50 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
};

export const Features = () => {
  return (
    <section id="features" className="py-32 relative bg-black">
      <div className="container mx-auto px-6">
        
        {/* Text Reveal Selection */}
        <div className="min-h-[50vh] flex flex-col justify-center mb-32">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: "-200px" }}
            transition={{ staggerChildren: 0.1 }}
            className="text-4xl md:text-7xl font-bold leading-tight"
          >
            <span className="block text-white/40 mb-4">STOP LIMITING.</span>
            <span className="block text-white">START EXPLORING WITH</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-600">
               MULTI-MODEL AI.
            </span>
          </motion.h2>
        </div>

        <div className="mb-20">
          <motion.h2 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight"
          >
            INTELLIGENCE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-600">UNLEASHED</span>
          </motion.h2>
          <motion.p
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="text-white/60 max-w-2xl text-lg"
          >
             Compare models, generate assets, and access live data. The ultimate workspace for next-gen thinkers.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Large Card */}
           <FeatureCard 
             title="Universal Model Access"
             description="Why settle for one? Switch instantly between GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, and DeepSeek R1 to find the perfect intelligence for your task."
             icon={Brain}
             delay={0.1}
             className="md:col-span-2 md:row-span-2 min-h-[400px]"
           />
           
           <FeatureCard 
             title="Live Web Search"
             description="Break the knowledge cutoff. Our real-time search engine fetches the latest news, stock prices, and paper citations instantly."
             icon={Zap}
             delay={0.2}
           />

           <FeatureCard 
             title="Image Generation"
             description="Visualize ideas in seconds. Integrated Flux and DALL-E support for stunning high-fidelity images."
             icon={Sparkles}
             delay={0.3}
           />
           
             <FeatureCard 
             title="Voice Interaction"
             description="Speak your mind. Natural voice input and output makes chatting with AI feel like a real conversation."
             icon={MessageCircle}
             delay={0.4}
             className="md:col-span-3"
           />
        </div>

      </div>
    </section>
  );
};
