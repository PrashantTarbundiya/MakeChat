import { MessageBubble } from './MessageBubble';
import { Code2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const CanvasView = ({ content, isLoading = false }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group w-full"
    >
      {/* Outer ambient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 via-indigo-500/20 to-violet-600/20 rounded-3xl blur opacity-0 group-hover:opacity-40 transition duration-500 pointer-events-none" />
      
      <div className="relative bg-[#0f1014]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Gloss Highlight */}
        <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* Header Ribbon with macOS dots */}
        <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/[0.06] bg-[#17181c] flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-3.5">
            {/* macOS window dots */}
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]"></div>
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]"></div>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
              <Code2 className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-200 tracking-wide flex items-center gap-1.5">
                Canvas
                {isLoading ? (
                  <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400/60" />
                )}
              </h3>
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-1.5 opacity-50">
              {[1, 2, 3].map((i) => (
                <motion.div 
                  key={i}
                  className="w-1.5 h-1.5 bg-violet-500/50 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 bg-[#1e1e1e] p-2 sm:p-4 max-h-[300px] sm:max-h-[600px] overflow-y-auto overflow-x-auto">
          <MessageBubble content={content} role="assistant" />
        </div>
      </div>
    </motion.div>
  );
};
