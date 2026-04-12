import { X, Sparkles, Network, Map, FileCode2, Image as ImageIcon, Film, Mic, Music, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ModelsModal = ({ isOpen, onClose, onSelectModel }) => {
  const modelCategories = [
    {
      title: "Structural Formatting",
      models: [
        { id: 'mode-diagram', name: 'Diagram Generator', desc: 'Generate visual architectures & flowcharts', Icon: Network, color: 'text-emerald-400', glow: 'group-hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:border-emerald-500/40' },
        { id: 'mode-map', name: 'Interactive Map', desc: 'Render geographical locations & routes', Icon: Map, color: 'text-purple-400', glow: 'group-hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] group-hover:border-purple-500/40' },
        { id: 'mode-file', name: 'File Generator', desc: 'Securely generate downloadable documents', Icon: FileCode2, color: 'text-orange-400', glow: 'group-hover:shadow-[0_0_20px_rgba(251,146,60,0.15)] group-hover:border-orange-500/40' },
      ]
    },
    {
      title: "Creative Media Studio",
      models: [
        { id: 'bytez-image', name: 'Image Generation', desc: 'Generate vivid images purely from text', Icon: ImageIcon, color: 'text-pink-400', glow: 'group-hover:shadow-[0_0_20px_rgba(244,114,182,0.15)] group-hover:border-pink-500/40' },
        { id: 'bytez-video', name: 'Video Generation', desc: 'Render complete AI video scenes', Icon: Film, color: 'text-rose-400', glow: 'group-hover:shadow-[0_0_20px_rgba(251,113,133,0.15)] group-hover:border-rose-500/40' },
        { id: 'bytez-audio', name: 'Audio Generation', desc: 'Synthesize speech and crisp vocal effects', Icon: Mic, color: 'text-cyan-400', glow: 'group-hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] group-hover:border-cyan-500/40' },
        { id: 'bytez-music', name: 'Music Generation', desc: 'Compose entire musical orchestrations', Icon: Music, color: 'text-amber-400', glow: 'group-hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] group-hover:border-amber-500/40' }
      ]
    },
    {
      title: "Advanced AI Routing",
      models: [
        { id: 'llm-council', name: 'LLM Council', desc: 'Multiple AIs privately vote on the best answer', Icon: BrainCircuit, color: 'text-indigo-400', glow: 'group-hover:shadow-[0_0_30px_rgba(129,140,248,0.2)] group-hover:border-indigo-500/50' }
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Stunning Animated Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-[#0f1014]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-[850px] max-h-[85vh] mx-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Gloss Highlights */}
            <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">
                    Special Models
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5 font-medium">Select a fully isolated execution environment</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-4">
              {modelCategories.map((category, catIdx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.1 }}
                  key={catIdx} 
                  className="space-y-4 relative"
                >
                  <div className="flex items-center gap-4">
                    <h4 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
                      {category.title}
                    </h4>
                    <div className="h-px bg-gradient-to-r from-white/[0.08] to-transparent flex-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.models.map((model, i) => (
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model.id);
                          onClose();
                        }}
                        className={`group relative flex items-start gap-4 p-5 bg-[#17181c] border border-white/[0.04] rounded-2xl text-left transition-all duration-300 overflow-hidden ${model.glow}`}
                      >
                         {/* Flowing background glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        <div className={`p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors duration-300 group-hover:bg-black/60 relative z-10`}>
                          <model.Icon className={`w-6 h-6 ${model.color}`} />
                        </div>
                        
                        <div className="relative z-10 pt-1">
                          <span className="block text-base tracking-wide text-gray-200 group-hover:text-white font-semibold transition-colors duration-300 mb-1">
                            {model.name}
                          </span>
                          <span className="block text-[13px] text-gray-500 group-hover:text-gray-400 transition-colors leading-relaxed">
                            {model.desc}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
