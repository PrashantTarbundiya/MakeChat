import { useState, useEffect } from 'react';
import { X, LogOut, Trash2, BarChart3, Brain, Settings2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODEL_LABELS = {
  'llama-maverick': { name: 'Llama Maverick', emoji: '🦙' },
  'gpt-oss': { name: 'GPT OSS', emoji: '🤖' },
  'llama-scout': { name: 'Llama Scout', emoji: '🦙' },
  'nemotron-super': { name: 'Nemotron 120B', emoji: '🟩' },
  'gemini-pro': { name: 'Gemini Pro', emoji: '♊' },
  'deepseek': { name: 'DeepSeek V3.2', emoji: '🔍' },
  'qwen-32b': { name: 'Qwen 32B', emoji: '🧠' },
  'claude-opus': { name: 'Claude Opus 4.5', emoji: '🎵' },
  'llm-council': { name: 'LLM Council', emoji: '🏛️' },
  'bytez-image': { name: 'Image Gen', emoji: '🎨' },
  'bytez-video': { name: 'Video Gen', emoji: '🎬' },
  'bytez-audio': { name: 'Audio Gen', emoji: '🎙️' },
  'bytez-music': { name: 'Music Gen', emoji: '🎵' },
};

export const Settings = ({ user, isOpen, setIsOpen, onLogout }) => {
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');
  const [usageStats, setUsageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('memory');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id && user.id !== 'guest') {
      fetchSettings();
      fetchUsageStats();
    }
  }, [isOpen, user]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memory/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memory: newMemory })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        setNewMemory('');
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const deleteMemory = async (index) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memory/${index}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const clearAllMemories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/memory/clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        fetchSettings();
        setShowClearConfirm(false);
      }
    } catch (error) {
      console.error('Failed to clear memories:', error);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!user || user.id === 'guest' || !isOpen) return null;

  // Prepare sorted usage data including models with 0 usage
  const allModelsStats = { ...MODEL_LABELS };
  Object.keys(allModelsStats).forEach(modelId => {
    allModelsStats[modelId] = { count: 0, lastUsed: null, ...allModelsStats[modelId] };
  });
  
  if (usageStats?.stats) {
    Object.entries(usageStats.stats).forEach(([modelId, data]) => {
      if (!allModelsStats[modelId]) {
        allModelsStats[modelId] = { name: modelId, emoji: 'ðŸ¤–', count: 0, lastUsed: null };
      }
      allModelsStats[modelId].count = data.count;
      allModelsStats[modelId].lastUsed = data.lastUsed;
    });
  }

  const sortedStats = Object.entries(allModelsStats)
    .sort(([, a], [, b]) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const maxCount = sortedStats.length > 0 ? sortedStats[0][1].count : 0;

  const tabs = [
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-[#0a0b0e] backdrop-blur-2xl border border-white/[0.08] rounded-3xl w-full max-w-[850px] max-h-[92vh] mx-auto flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.7)] relative overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Gloss Highlight */}
            <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 pb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <Settings2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">
                    Settings
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Manage your preferences</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Two-Column Layout â€” Left sticky, Right scrolls */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 px-6 sm:px-8 pb-6 sm:pb-8">

                {/* Left Column â€” Sticky sidebar */}
                <div className="flex flex-col gap-4 md:w-[280px] md:flex-shrink-0">
                  {/* Profile Card */}
                  <div className="p-5 bg-[#111215] border border-white/[0.06] rounded-2xl flex items-center gap-4">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-white font-bold text-lg">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{user.name || 'User'}</p>
                      <p className="text-gray-500 text-sm truncate">{user.email || ''}</p>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex flex-col gap-1.5">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 text-left ${
                          activeTab === tab.id 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-[#111215] text-gray-400 border border-white/[0.04] hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Sign Out */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onLogout} 
                    className="w-full flex items-center justify-center gap-2.5 p-3.5 bg-[#111215] border border-red-500/10 hover:border-red-500/30 rounded-2xl text-red-400/80 hover:text-red-400 text-sm font-medium transition-all duration-300 mt-auto"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </motion.button>
                </div>

                {/* Right Column â€” Scrollable Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
                  {/* Memory Tab */}
                  {activeTab === 'memory' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-center gap-4 mb-5">
                        <h4 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Personalized Memory</h4>
                        <div className="h-px bg-gradient-to-r from-white/[0.08] to-transparent flex-1" />
                        <span className="text-xs text-gray-500 font-medium">{memories.length} items</span>
                      </div>

                      <p className="text-gray-500 text-sm mb-5 leading-relaxed">AI uses saved memories to personalize responses for you.</p>
                      
                      {/* Add Memory â€” at top for quick access */}
                      <div className="flex gap-3 mb-5">
                        <input
                          value={newMemory}
                          onChange={(e) => setNewMemory(e.target.value)}
                          placeholder="e.g., I'm a frontend developer"
                          className="flex-1 bg-[#111215] border border-white/[0.06] focus:border-emerald-500/40 px-4 py-3.5 rounded-2xl text-white placeholder-gray-500 outline-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(16,185,129,0.1)] text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                        />
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={addMemory} 
                          className="px-5 py-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-medium transition-all duration-300 flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </motion.button>
                      </div>

                      {/* Memory Items */}
                      <div className="space-y-2.5 mb-5">
                        {memories.map((mem, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: Math.min(i * 0.05, 0.3) }}
                            className="group flex items-center justify-between p-4 bg-[#111215] border border-white/[0.06] rounded-2xl hover:border-white/[0.1] transition-all duration-300"
                          >
                            <span className="text-gray-300 text-sm break-words flex-1 mr-3">{mem}</span>
                            <button 
                              onClick={() => deleteMemory(i)} 
                              className="p-2 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                        {memories.length === 0 && (
                          <div className="text-center py-8">
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#111215] border border-white/5 flex items-center justify-center mb-4">
                              <Brain className="w-7 h-7 text-gray-500" />
                            </div>
                            <p className="text-gray-400 font-medium">No memories saved</p>
                            <p className="text-sm text-gray-500 mt-1">Add one above to personalize AI</p>
                          </div>
                        )}
                      </div>

                      {memories.length > 0 && (
                        <div className="mt-12 mb-4">
                          <div className="relative group/danger">
                            <div className="absolute inset-x-0 inset-y-2 bg-red-500/5 blur-2xl rounded-full transition-opacity opacity-50 group-hover/danger:opacity-100" />
                            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-[#0a0a0c] border border-red-500/20 rounded-2xl transition-all duration-300 hover:border-red-500/40">
                              <div className="pr-4 mb-4 sm:mb-0">
                                <h4 className="text-sm font-semibold text-red-500 flex items-center gap-2 mb-1.5">
                                  <Trash2 className="w-4 h-4" /> Danger Zone
                                </h4>
                                <p className="text-xs text-red-400/70 leading-relaxed">
                                  Permanently erase all personalized memories. This AI will completely forget everything it learned about you.
                                </p>
                              </div>
                              <button 
                                onClick={() => setShowClearConfirm(true)} 
                                className="w-full sm:w-auto px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)] flex-shrink-0"
                              >
                                Clear History
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Usage Tab */}
                  {activeTab === 'usage' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      {/* Stats header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <h4 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">Model Usage</h4>
                          <div className="h-px bg-gradient-to-r from-white/[0.08] to-transparent flex-1" />
                        </div>
                        <div className="px-4 py-2 bg-[#111215] border border-white/[0.06] rounded-xl">
                          <span className="text-emerald-400 text-lg font-bold">{usageStats?.totalMessages || 0}</span>
                          <span className="text-gray-500 text-xs ml-2">total</span>
                        </div>
                      </div>

                      {sortedStats.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#111215] border border-white/5 flex items-center justify-center mb-4">
                            <BarChart3 className="w-7 h-7 text-gray-500" />
                          </div>
                          <p className="text-gray-300 font-semibold text-lg">No usage data yet</p>
                          <p className="text-sm text-gray-500 mt-2">Start chatting to see your stats!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sortedStats.map(([modelId, data], index) => {
                            const label = MODEL_LABELS[modelId] || { name: modelId, emoji: 'ðŸ¤–' };
                            const percentage = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                            const barColors = [
                              'from-emerald-500 to-emerald-400',
                              'from-teal-500 to-teal-400',
                              'from-cyan-500 to-cyan-400',
                              'from-gray-500 to-gray-400'
                            ];
                            const barColor = barColors[Math.min(index, barColors.length - 1)];
                            
                            return (
                              <motion.div 
                                key={modelId} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(index * 0.03, 0.4) }}
                                className="group p-4 bg-[#111215] border border-white/[0.06] rounded-2xl hover:border-white/[0.1] transition-all duration-300"
                              >
                                <div className="flex items-center justify-between mb-2.5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-base flex-shrink-0">{label.emoji}</span>
                                    <span className="text-gray-200 text-sm font-medium truncate">{label.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-gray-500 text-xs">{getTimeAgo(data.lastUsed)}</span>
                                    <span className="text-white text-xs font-bold bg-white/[0.06] px-2.5 py-1 rounded-lg">{data.count}</span>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.8, delay: Math.min(index * 0.05, 0.5), ease: "easeOut" }}
                                    className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
            </div>
          </motion.div>
        </div>

        {/* Clear Memories Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowClearConfirm(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-sm bg-[#0f1115] border border-white/5 rounded-2xl p-6 shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/20 via-red-500/50 to-red-500/20" />
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Clear All?</h3>
                    <p className="text-sm text-gray-400">MakeChat will forget all personalized information learned from your conversations.</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowClearConfirm(false)} 
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={clearAllMemories} 
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40"
                  >
                    Clear History
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
