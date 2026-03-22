import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const QueryOutline = ({ messages, onScrollTo }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract only user messages with their original indices
  const userQueries = messages
    .map((msg, i) => ({ ...msg, originalIndex: i }))
    .filter(msg => msg.role === 'user');

  if (userQueries.length === 0) return null;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 hidden lg:block"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Collapsed: just dots */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-end gap-2 py-4 pr-2 cursor-pointer"
          >
            {userQueries.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded: full query list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[#1a1b1e]/95 backdrop-blur-md border-l border-white/10 rounded-l-xl shadow-2xl max-h-[60vh] overflow-y-auto py-3"
          >
            <div className="px-3 pb-2 mb-2 border-b border-white/10">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Queries</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-[180px] max-w-[240px]">
              {userQueries.map((query, i) => {
                const text = query.content
                  .replace(/!\[.*?\]\(.*?\)/g, '')
                  .replace(/\[.*?:.*?\]/g, '')
                  .replace(/📄.*?\n/g, '')
                  .trim()
                  .slice(0, 45);

                return (
                  <button
                    key={query.originalIndex}
                    onClick={() => onScrollTo(query.originalIndex)}
                    className="group flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-colors rounded-md mx-1"
                  >
                    <span className="text-emerald-500/70 text-[10px] font-mono w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-gray-400 text-xs truncate group-hover:text-white transition-colors">
                      {text || 'Query'}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
