import { useState, useEffect } from 'react';
import { X, LogOut, Trash2, BarChart3 } from 'lucide-react';

const MODEL_LABELS = {
  'llama-maverick': { name: 'Llama Maverick', emoji: '🦙' },
  'gpt-oss': { name: 'GPT OSS', emoji: '🤖' },
  'llama-scout': { name: 'Llama Scout', emoji: '🦙' },
  'kimi': { name: 'Kimi', emoji: '🌙' },
  'gemini-pro': { name: 'Gemini Pro', emoji: '♊' },
  'grok-fast': { name: 'Grok 4.1 Fast', emoji: '⚡' },
  'deepseek': { name: 'DeepSeek V3.2', emoji: '🔍' },
  'step-3.5-flash': { name: 'Step 3.5 Flash', emoji: '💫' },
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
    if (!confirm('Delete all personalized memories?')) return;
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
  // Initialize all with 0 count
  Object.keys(allModelsStats).forEach(modelId => {
    allModelsStats[modelId] = { count: 0, lastUsed: null, ...allModelsStats[modelId] };
  });
  
  // Merge actual usage
  if (usageStats?.stats) {
    Object.entries(usageStats.stats).forEach(([modelId, data]) => {
      if (!allModelsStats[modelId]) {
        allModelsStats[modelId] = { name: modelId, emoji: '🤖', count: 0, lastUsed: null };
      }
      allModelsStats[modelId].count = data.count;
      allModelsStats[modelId].lastUsed = data.lastUsed;
    });
  }

  const sortedStats = Object.entries(allModelsStats)
    .sort(([, a], [, b]) => {
      // Sort by count descending, then alphabetically by name
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const maxCount = sortedStats.length > 0 ? sortedStats[0][1].count : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2B2E] rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Settings</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'memory' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
          >
            🧠 Memory
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'usage' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" /> Usage
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Memory Tab */}
          {activeTab === 'memory' && (
            <div>
              <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">Manage Personalized Memory</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3">Reference saved memories - AI will use this information to personalize responses</p>
              <div className="space-y-2 mb-3 max-h-[30vh] overflow-y-auto">
                {memories.map((mem, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/10 p-2 rounded text-white text-xs sm:text-sm">
                    <span className="break-words flex-1 mr-2">{mem}</span>
                    <button onClick={() => deleteMemory(i)} className="p-1 hover:bg-red-500/20 rounded text-red-400 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {memories.length > 0 && (
                <button onClick={clearAllMemories} className="w-full mb-3 px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-xs sm:text-sm">
                  Clear All Memories
                </button>
              )}
              <div className="flex gap-2">
                <input
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="e.g., I'm a developer"
                  className="flex-1 bg-white/10 px-2 sm:px-3 py-2 rounded text-white outline-none text-xs sm:text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addMemory()}
                />
                <button onClick={addMemory} className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white text-xs sm:text-sm">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Usage Dashboard Tab */}
          {activeTab === 'usage' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm sm:text-base">Usage Dashboard</h3>
                <div className="text-right">
                  <div className="text-emerald-400 text-lg font-bold">{usageStats?.totalMessages || 0}</div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider">Total Messages</div>
                </div>
              </div>

              {sortedStats.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-gray-400 text-sm">No usage data yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start chatting to see your stats!</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                  {sortedStats.map(([modelId, data], index) => {
                    const label = MODEL_LABELS[modelId] || { name: modelId, emoji: '🤖' };
                    // Avoid NaN if maxCount is 0
                    const percentage = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                    return (
                      <div key={modelId} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm flex-shrink-0">{label.emoji}</span>
                            <span className="text-white text-xs sm:text-sm truncate">{label.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-gray-500 text-[10px]">{getTimeAgo(data.lastUsed)}</span>
                            <span className="text-white text-xs font-semibold bg-white/10 px-1.5 py-0.5 rounded">{data.count}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#6b7280'}, ${index === 0 ? '#34d399' : index === 1 ? '#60a5fa' : index === 2 ? '#a78bfa' : '#9ca3af'})`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white text-sm">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
