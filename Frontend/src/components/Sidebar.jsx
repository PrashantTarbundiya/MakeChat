import { useState, useEffect } from 'react';
import { Menu, X, Plus, MessageSquare, Settings, Trash2, Edit2, Share2, MoreVertical, Search, Sparkles } from 'lucide-react';
import { ModelsModal } from './ModelsModal';

export const Sidebar = ({ user, onLogout, onNewChat, onSelectChat, currentChatId, refreshTrigger, isOpen, setIsOpen, onOpenSettings }) => {
  const [chats, setChats] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelsOpen, setModelsOpen] = useState(false);

  useEffect(() => {
    if (user.id !== 'guest') {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchChats();
      if (currentChatId === chatId) onNewChat();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
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
      await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}/rename`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: editTitle })
      });
      fetchChats();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  return (
    <>
      <div className={`fixed left-0 top-0 h-full bg-[#1F2023] text-white transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64 flex flex-col`}>
        <div className="h-[50px]"></div>
        <div className="p-4 border-b border-gray-700 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5" />
            Search
          </button>
          <button
            onClick={() => setModelsOpen(!modelsOpen)}
            className="w-full flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Models
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {user.id === 'guest' ? (
            <div className="text-gray-400 text-sm text-center py-4">
              Login to save chat history
            </div>
          ) : chats.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No chats yet
            </div>
          ) : (
            chats.map(chat => (
              <div key={chat._id} className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                currentChatId === chat._id ? 'bg-white/20' : 'hover:bg-white/10'
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
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === chat._id ? null : chat._id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded">
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
                            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chat._id}/share`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (response.ok) {
                              const data = await response.json();
                              const shareUrl = `${window.location.origin}/share/${data.shareToken}`;
                              if (navigator.share) {
                                await navigator.share({ url: shareUrl, title: chat.title });
                              } else {
                                navigator.clipboard.writeText(shareUrl);
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

        <div className="p-4 border-t border-gray-700">
          {user.id === 'guest' ? (
            <div className="space-y-2">
              <a href="/login" className="w-full block text-center px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white">
                Login
              </a>
              <a href="/signup" className="w-full block text-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white">
                Sign Up
              </a>
            </div>
          ) : (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm flex-1 text-left truncate">{user.name}</span>
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

      {searchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSearchOpen(false)}>
          <div className="bg-[#1F2023] rounded-lg p-6 w-[600px] h-[500px] mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Search Chats</h3>
              <button onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 outline-none mb-4"
            />
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {chats.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
                <button
                  key={chat._id}
                  onClick={() => { onSelectChat(chat._id); setSearchOpen(false); setSearchQuery(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg text-left transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-[#2A2B2E] rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Chat?</h3>
            <p className="text-gray-400 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg">
                Cancel
              </button>
              <button onClick={() => deleteChat(deleteConfirm)} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
