import { MessageBubble } from './MessageBubble';
import { Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const SearchView = ({ content, isLoading = false }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group w-full"
    >
      {/* Outer ambient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-emerald-600/20 rounded-3xl blur opacity-0 group-hover:opacity-40 transition duration-500 pointer-events-none" />
      
      <div className="relative bg-[#0f1014]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Gloss Highlight */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Header Ribbon */}
        <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/[0.06] bg-[#17181c] flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-hidden">
           <div className="flex items-center gap-3.5">
             <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
               <Globe className="w-5 h-5 text-emerald-400" />
             </div>
             <div>
               <h3 className="text-sm sm:text-base font-bold text-gray-200 tracking-wide flex items-center gap-1.5">
                 Live Web Search
                 {isLoading ? (
                   <Sparkles className="w-3.5 h-3.5 text-emerald-400/60" />
                 ) : (
                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
                 )}
               </h3>
               <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                 {isLoading ? 'Synthesizing real-time web results' : 'Search complete'}
               </p>
             </div>
           </div>
           
           {/* Animated visualizer bars — only while loading */}
           {isLoading && (
             <div className="hidden sm:flex items-center gap-1 opacity-50">
               {[1, 2, 3, 4, 5].map((i) => (
                 <motion.div 
                   key={i}
                   className="w-1 bg-emerald-500/40 rounded-full"
                   animate={{ height: ["4px", "14px", "4px"] }}
                   transition={{ repeat: Infinity, duration: 1, delay: i * 0.15, ease: "easeInOut" }}
                 />
               ))}
             </div>
           )}
        </div>

        {/* Content */}
        <div className="relative z-10 p-2 sm:p-5">
           <MessageBubble content={content} role="assistant" />
        </div>
      </div>
    </motion.div>
  );
};
