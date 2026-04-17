import { useEffect, useMemo, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { BrainCircuit, Sparkles, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ThinkingView = ({ content, isLoading = false }) => {
  // Default to open if loading, closed if finished
  const [isOpen, setIsOpen] = useState(isLoading);

  const executionStepCount = useMemo(() => {
    const text = (content || '').replace(/<[^>]*>/g, ' ').trim();
    if (!text) return 0;

    const lines = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const explicitStepPattern = /^(?:step\s*\d+[:.)-]?|stage\s*\d+[:.)-]?|phase\s*\d+[:.)-]?|\d+[.)]|[-*•]\s+)/i;
    const explicitLineSteps = lines.filter((line) => explicitStepPattern.test(line)).length;
    if (explicitLineSteps > 0) return explicitLineSteps;

    const inlineStepMarkers = (text.match(/\b(?:step|stage|phase)\s*\d+\b/gi) || []).length;
    if (inlineStepMarkers > 0) return inlineStepMarkers;

    const paragraphChunks = text
      .split(/\n\s*\n+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean).length;
    if (paragraphChunks > 1) return paragraphChunks;

    return Math.max(1, Math.min(8, Math.round(text.length / 220)));
  }, [content]);

  useEffect(() => {
    if (!isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group w-full"
    >
      {/* Outer ambient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-amber-600/20 rounded-3xl blur opacity-0 group-hover:opacity-40 transition duration-500 pointer-events-none" />
      
      <div className="relative bg-[#0f1014]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Gloss Highlight */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Header Ribbon */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left relative z-10 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/[0.06] bg-[#17181c] hover:bg-[#1f2025] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-hidden cursor-pointer"
        >
           <div className="flex items-center gap-3.5">
             <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
               <BrainCircuit className="w-5 h-5 text-amber-400" />
             </div>
             <div>
               <h3 className="text-sm sm:text-base font-bold text-gray-200 tracking-wide flex items-center gap-1.5">
                 Deep Thinking
                 {isLoading ? (
                   <Sparkles className="w-3.5 h-3.5 text-amber-400/60" />
                 ) : (
                   <CheckCircle2 className="w-3.5 h-3.5 text-amber-400/60" />
                 )}
               </h3>
               <p className="text-[11px] sm:text-xs text-gray-500 font-medium flex items-center gap-1.5">
                 {isLoading ? 'Processing complex multi-step reasoning' : 'Reasoning complete'}
                 {executionStepCount > 0 && (
                   <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                     Execution: {executionStepCount} {executionStepCount === 1 ? 'step' : 'steps'}
                   </span>
                 )}
                 <span className="inline-block ml-1 opacity-70">
                   {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                 </span>
               </p>
             </div>
           </div>
           
           {/* Pulsing dots — only while loading */}
           {isLoading && (
             <div className="hidden sm:flex items-center gap-1.5 opacity-50">
               {[1, 2, 3].map((i) => (
                 <motion.div 
                   key={i}
                   className="w-1.5 h-1.5 bg-amber-500/50 rounded-full"
                   animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                   transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "easeInOut" }}
                 />
               ))}
             </div>
           )}
        </button>

        {/* Content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative z-10"
            >
              <div className="p-2 sm:p-5 opacity-80 text-sm">
                 <MessageBubble content={content || 'Thinking...'} role="assistant" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
