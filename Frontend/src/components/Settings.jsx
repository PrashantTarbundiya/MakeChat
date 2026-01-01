import { useState, useEffect } from 'react';
import { X, LogOut, Trash2 } from 'lucide-react';

export const Settings = ({ user, isOpen, setIsOpen, onLogout }) => {
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    if (isOpen && user?.id && user.id !== 'guest') {
      fetchSettings();
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

  if (!user || user.id === 'guest' || !isOpen) return null;

  return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2A2B2E] rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Settings</h2>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
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

              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white text-sm">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
  );
};
