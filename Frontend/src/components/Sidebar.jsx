import { useState, useEffect } from 'react';
import { Menu, X, Plus, MessageSquare, Settings, Trash2, Edit2, Share2, MoreVertical, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelsModal } from './ModelsModal';

export const Sidebar = ({ user, onLogout, onNewChat, onSelectChat, currentChatId, backgroundGenerations, refreshTrigger, isOpen, setIsOpen, onOpenSettings }) => {
  const [chats, setChats] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false);

  useEffect(() => {
    if (user?.id && user.id !== 'guest') {
      fetchChats();
    }
  }, [user, refreshTrigger]);

  useEffect(() => {
    const handleClick = () => setMenuOpen(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchChats = async () => {
    try {
      // Load from cache first
      const cachedChats = localStorage.getItem('cachedChats');
      if (cachedChats) {
        setChats(JSON.parse(cachedChats));
      }

      // Then fetch fresh data
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping chat fetch');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        // Token is invalid or expired
        console.log('Token expired or invalid, clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const recentChats = data.slice(0, 4); // Keep only last 4
        setChats(data);
        localStorage.setItem('cachedChats', JSON.stringify(recentChats));
      } else {
        console.error('Failed to fetch chats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Close the confirmation modal immediately
      setDeleteConfirm(null);
      setMenuOpen(null);

      // Remove from local state immediately for instant UI feedback
      setChats(prev => prev.filter(c => c._id !== chatId));
      const updatedChats = chats.filter(c => c._id !== chatId).slice(0, 4);
      localStorage.setItem('cachedChats', JSON.stringify(updatedChats));

      if (currentChatId === chatId) onNewChat();

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}`, {
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
        fetchChats(); // Refetch to ensure sync with server
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      fetchChats(); // Refetch on error to restore state
    }
  };

  const startRename = (chat) => {
    setEditingId(chat._id);
    setEditTitle(chat.title);
    setMenuOpen(null);
  };

  const saveRename = async (chatId) => {
    if (!editTitle.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}/rename`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editTitle })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cachedChats');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        fetchChats();
        setEditingId(null);
        // Update cache - move renamed chat to top
        const renamedChat = chats.find(c => c._id === chatId);
        if (renamedChat) {
          const filteredChats = chats.filter(c => c._id !== chatId);
          const updatedChats = [{ ...renamedChat, title: editTitle, updatedAt: new Date().toISOString() }, ...filteredChats].slice(0, 4);
          localStorage.setItem('cachedChats', JSON.stringify(updatedChats));
        }
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  return (
    <>
      <div className={`fixed left-0 top-0 h-full bg-black text-white transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 flex flex-col border-r border-white/10`}>
        <div className="h-[50px]"></div>
        <div className="p-3 sm:p-4 border-b border-white/10 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm font-medium group"
          >
            <Plus className="w-4 sm:w-5 h-4 sm:h-5 transition-transform duration-300 group-hover:rotate-90" />
            New Chat
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm group"
          >
            <Search className="w-4 sm:w-5 h-4 sm:h-5 transition-all duration-300 group-hover:-rotate-12 group-hover:scale-110" />
            Search
          </button>
          <button
            onClick={() => setModelsOpen(!modelsOpen)}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 hover:text-emerald-400 rounded-lg transition-colors text-sm group"
          >
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 group-hover:text-emerald-400" />
            Models
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {!user || user.id === 'guest' ? (
            <div className="text-gray-400 text-sm text-center py-4">
              Login to save chat history
            </div>
          ) : chats.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No chats yet
            </div>
          ) : (
            chats.map(chat => (
              <div key={chat._id} className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentChatId === chat._id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'
                }`}>
                {editingId === chat._id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveRename(chat._id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename(chat._id)}
                    className="flex-1 bg-white/10 px-2 py-1 rounded text-sm outline-none"
                  />
                ) : (
                  <>
                    <button onClick={() => onSelectChat(chat._id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm">{chat.title}</span>
                      {backgroundGenerations?.has(chat._id) && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
                      )}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === chat._id ? null : chat._id); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 hover:bg-white/10 rounded">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === chat._id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#2A2B2E] rounded-lg shadow-lg py-1 z-50 w-40" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); startRename(chat); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm text-left">
                          <Edit2 className="w-4 h-4" /> Rename
                        </button>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const token = localStorage.getItem('token');
                            if (!token || !user || user.id === 'guest') {
                              // Redirect to login if not authenticated
                              window.location.href = '/login';
                              return;
                            }

                            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chat._id}/share`, {
                              method: 'POST',
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
                              const shareUrl = `${window.location.origin}/share/${data.shareToken}`;
                              if (navigator.share) {
                                await navigator.share({ url: shareUrl, title: chat.title });
                              } else {
                                navigator.clipboard.writeText(shareUrl);
                                // Show a toast or alert that the link was copied
                                alert('Share link copied to clipboard!');
                              }
                            }
                          } catch (error) {
                            console.error('Share failed:', error);
                          }
                          setMenuOpen(null);
                        }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm text-left">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(chat._id); setMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-sm text-red-400 text-left">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-white/10">
          {!user || user.id === 'guest' ? (
            <div className="space-y-2">
              <a href="/login" className="w-full block text-center px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white text-sm">
                Login
              </a>
              <a href="/signup" className="w-full block text-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-sm">
                Sign Up
              </a>
            </div>
          ) : (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 hover:text-emerald-400 rounded-lg transition-colors text-white"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm flex-1 text-left truncate">{user.name || 'User'}</span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      <ModelsModal isOpen={modelsOpen} onClose={() => setModelsOpen(false)} onSelectModel={onSelectChat} />

      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-[#0f1014]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-[850px] max-h-[85vh] mx-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Gloss Highlight */}
              <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Header — matching ModelsModal style */}
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 shadow-inner">
                    <Search className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">
                      Search Chats
                    </h3>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">Browse your entire conversation archive</p>
                  </div>
                </div>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input — neutral with emerald focus */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search conversations..."
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 focus:border-emerald-500/40 rounded-2xl text-white placeholder-gray-500 outline-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(16,185,129,0.1)] text-base"
                />
              </div>

              {/* Category label */}
              <div className="flex items-center gap-4 mb-4">
                <h4 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
                  {searchQuery ? 'Search Results' : 'Recent Conversations'}
                </h4>
                <div className="h-px bg-gradient-to-r from-white/[0.08] to-transparent flex-1" />
                <span className="text-xs text-gray-500 font-medium">
                  {chats.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase())).length} chats
                </span>
              </div>

              {/* Results — isolated bento cards in a grid */}
              <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {chats.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase())).map((chat, idx) => (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      key={chat._id}
                      onClick={() => { onSelectChat(chat._id); setSearchOpen(false); setSearchQuery(''); }}
                      className="group relative flex items-start gap-4 p-5 bg-[#17181c] border border-white/[0.04] rounded-2xl text-left transition-all duration-300 overflow-hidden group-hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-500/30"
                    >
                      {/* Hover background glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner transition-colors duration-300 group-hover:bg-black/60 relative z-10">
                        <MessageSquare className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors duration-300" />
                      </div>

                      <div className="relative z-10 pt-1 flex-1 min-w-0">
                        <span className="block text-base tracking-wide text-gray-200 group-hover:text-white font-semibold transition-colors duration-300 truncate">
                          {chat.title}
                        </span>
                        <span className="block text-[13px] text-gray-500 group-hover:text-gray-400 transition-colors leading-relaxed mt-1">
                          {chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Chat'}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {chats.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && searchQuery && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-[#17181c] border border-white/5 flex items-center justify-center mb-4">
                      <Search className="w-7 h-7 text-gray-500" />
                    </div>
                    <p className="text-gray-300 font-semibold text-lg">No results found</p>
                    <p className="text-sm text-gray-500 mt-2">Try different keywords to find your conversation</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
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
                  <h3 className="text-lg font-semibold text-white mb-1">Delete Chat</h3>
                  <p className="text-sm text-gray-400">This action cannot be undone. This will permanently delete your conversation history.</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteChat(deleteConfirm)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
