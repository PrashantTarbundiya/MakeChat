import React from 'react';
import { motion } from 'framer-motion';

// In a real implementation, you would use actual SVG logos.
// For now, we use text with styling to represent the brands.
const logos = [
  { name: 'OpenAI', color: 'bg-green-500/20' },
  { name: 'Anthropic', color: 'bg-orange-500/20' },
  { name: 'Google DeepMind', color: 'bg-blue-500/20' },
  { name: 'Meta AI', color: 'bg-blue-400/20' },
  { name: 'Mistral', color: 'bg-yellow-500/20' },
  { name: 'DeepSeek', color: 'bg-blue-600/20' },
  { name: 'Stability AI', color: 'bg-purple-500/20' },
  { name: 'Cohere', color: 'bg-teal-500/20' },
];

export const LogoTicker = () => {
  return (
    <section className="py-20 bg-black overflow-hidden border-b border-white/5">
      <div className="container mx-auto px-6 mb-8">
        <p className="text-center text-sm font-medium text-white/40 tracking-[0.2em] uppercase">
          Powered by world-class intelligence
        </p>
      </div>
      
      <div className="flex relative overflow-hidden before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-[100px] before:bg-gradient-to-r before:from-black before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-[100px] after:bg-gradient-to-l after:from-black after:to-transparent">
        <motion.div
           className="flex gap-16 items-center pr-16"
           animate={{
             x: [0, -1035], // Adjust calculation if needed
           }}
           transition={{
             x: {
               repeat: Infinity,
               repeatType: "loop",
               duration: 30,
               ease: "linear",
             },
           }}
        >
          {[...logos, ...logos, ...logos].map((logo, index) => (
            <div key={index} className="flex items-center gap-2 group cursor-pointer flex-shrink-0">
               {/* Dot identifier */}
               <div className={`w-3 h-3 rounded-full ${logo.color} shadow-[0_0_10px_currentColor] transition-colors duration-500`} />
               <span className="text-xl font-bold text-white/30 group-hover:text-white transition-colors duration-500 uppercase tracking-widest whitespace-nowrap">
                 {logo.name}
               </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
