import { motion } from 'framer-motion';

export const Thinking = ({ className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center w-24 h-24 ${className}`}>
      {/* Outer Ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border border-emerald-500/30 rounded-full border-t-emerald-500"
      />
      
      {/* Middle Ring */}
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-white/10 rounded-full border-t-white/40"
      />
      
      {/* Inner Ring */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-8 border border-emerald-500/50 rounded-full border-b-emerald-400"
      />
      
      {/* Center Pulse */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"
      />
    </div>
  );
};
