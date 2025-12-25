import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageActions } from "@/components/MessageActions";
import { EditMessage } from "@/components/EditMessage";
import { CanvasView } from "@/components/CanvasView";
import { ThinkingView } from "@/components/ThinkingView";
import { SearchView } from "@/components/SearchView";
import { Sidebar } from "@/components/Sidebar";
import { Settings } from "@/components/Settings";
import { Header } from "@/components/Header";
import { useState, useRef, useEffect } from "react";
import toast, { Toaster } from 'react-hot-toast';

function App({ user, isShared = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-maverick');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thinkingPanel, setThinkingPanel] = useState(null);
  const [loadingState, setLoadingState] = useState('');
  const [shareToken, setShareToken] = useState(null);
  const [isForked, setIsForked] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastUserMessageRef = useRef(null);

  const handleSendMessage = async (message, files, model) => {
    // Fork shared chat on first message
    if (isShared && !isForked && user) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/shared/${shareToken}/fork`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const forkedChat = await response.json();
          setCurrentChatId(forkedChat._id);
          setIsForked(true);
          window.history.replaceState({}, '', '/');
        }
      } catch (error) {
        console.error('Failed to fork chat:', error);
      }
    }
    setSelectedModel(model);
    setIsLoading(true);
    setCurrentResponse('');
    
    // Auto-detect mode from message content
    let isSearch = message.startsWith('[Search:');
    let isThink = message.startsWith('[Think:');
    const isCanvas = message.startsWith('[Canvas:');
    
    // AI auto-detection
    if (!isSearch && !isThink && !isCanvas) {
      const lowerMsg = message.toLowerCase();
      const searchKeywords = ['latest', 'current', 'news', 'today', 'recent', 'what is happening', 'update on', 'search for', 'find information'];
      const thinkKeywords = ['analyze', 'compare', 'explain deeply', 'think about', 'reasoning', 'why', 'how does', 'complex'];
      
      if (searchKeywords.some(kw => lowerMsg.includes(kw))) {
        isSearch = true;
        message = `[Search: ${message}]`;
      } else if (thinkKeywords.some(kw => lowerMsg.includes(kw))) {
        isThink = true;
        message = `[Think: ${message}]`;
      }
    }
    
    // Set loading state
    if (isSearch) setLoadingState('🌐 Searching web...');
    else if (isThink) setLoadingState('🧠 Thinking deeply...');
    else setLoadingState('✨ Generating response...');
    
    // Remove mode prefix from display
    let cleanMessage = message;
    if (isSearch) cleanMessage = message.replace(/^\[Search:\s*/, '').replace(/\]$/, '');
    if (isThink) cleanMessage = message.replace(/^\[Think:\s*/, '').replace(/\]$/, '');
    if (isCanvas) cleanMessage = message.replace(/^\[Canvas:\s*/, '').replace(/\]$/, '');
    
    // Upload files to Cloudinary first if present (silently in background)
    let uploadedFileUrl = null;
    let uploadedFilePublicId = null;
    let uploadedFileInfo = '';
    let uploadRetries = 3;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Upload to Cloudinary with retries (no UI feedback)
      while (uploadRetries > 0 && !uploadedFileUrl) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/file`, {
            method: 'POST',
            body: formData
          });
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedFileUrl = uploadData.url;
            uploadedFilePublicId = uploadData.publicId;
            
            // Add file info to message (image first, then text)
            if (file.type.startsWith('image/')) {
              uploadedFileInfo = `![Uploaded Image](${uploadedFileUrl})\n\n`;
            } else {
              uploadedFileInfo = `📄 ${file.name}\n\n`;
            }
            break;
          }
        } catch (error) {
          console.error('Upload attempt failed:', error);
          uploadRetries--;
          if (uploadRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // If upload failed after retries, don't send message
      if (!uploadedFileUrl) {
        setIsLoading(false);
        alert('File upload failed. Please try again.');
        return;
      }
    }
    
    setMessages(prev => [...prev, { role: 'user', content: cleanMessage + uploadedFileInfo, mode: isSearch ? 'search' : isThink ? 'think' : isCanvas ? 'canvas' : 'normal', filePublicId: uploadedFilePublicId }]);

    setTimeout(() => {
      lastUserMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('model', model);
      formData.append('userId', user?.id || 'guest');
      if (currentChatId) formData.append('chatId', currentChatId);
      if (uploadedFileUrl) {
        formData.append('fileUrl', uploadedFileUrl);
        formData.append('filePublicId', uploadedFilePublicId);
      }
      files?.forEach(file => formData.append('files', file));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let thinkingText = '';
      const isMediaModel = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music'].includes(model);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.reasoning) {
                thinkingText += parsed.reasoning;
              }
              if (isMediaModel && parsed.content?.includes('media-container')) {
                fullResponse = parsed.content;
              } else if (parsed.content) {
                fullResponse += parsed.content;
              }
              setCurrentResponse(fullResponse);
            } catch (e) {}
          }
        }
      }

      let cleanResponse = fullResponse.replace(/<\d+\/\d+>/g, '').trim();
      let extractedThinking = thinkingText;
      
      const thinkMatch = cleanResponse.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        extractedThinking = thinkMatch[1].trim();
        cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }
      
      // Store thinking if present
      const hasThinking = extractedThinking && extractedThinking.trim().length > 0;
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        const versions = lastMsg?.versions || [];
        versions.push(cleanResponse);
        
        return [...prev, { 
          role: 'assistant', 
          content: cleanResponse, 
          model, 
          mode: isSearch ? 'search' : isThink ? 'think' : isCanvas ? 'canvas' : 'normal', 
          thinking: hasThinking ? extractedThinking : undefined,
          versions,
          currentVersion: versions.length - 1
        }];
      });
      setCurrentResponse('');
    } catch (error) {
      if (error.name === 'AbortError') {
        if (currentResponse) {
          const cleanResponse = currentResponse.replace(/<\d+\/\d+>/g, '').trim();
          setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse + ' [Stopped]', model }]);
        }
        setCurrentResponse('');
      } else {
        console.error('Error:', error);
      }
    } finally {
      setIsLoading(false);
      setLoadingState('');
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = async () => {
    if (messages.length >= 2) {
      const lastUserMsg = messages[messages.length - 2];
      const lastAssistantMsg = messages[messages.length - 1];
      
      // Store current response as a version
      const versions = lastAssistantMsg.versions || [lastAssistantMsg.content];
      
      // Remove last assistant message and regenerate without adding user message again
      setMessages(prev => prev.slice(0, -1));
      
      // Call the API directly without adding user message
      setIsLoading(true);
      setCurrentResponse('');
      abortControllerRef.current = new AbortController();

      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('message', lastUserMsg.content);
        formData.append('model', lastAssistantMsg.model || selectedModel);
        formData.append('userId', user?.id || 'guest');
        formData.append('mode', lastAssistantMsg.mode || 'normal');
        if (token) formData.append('token', token);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let thinkingText = '';
        const isMediaModel = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music'].includes(lastAssistantMsg.model || selectedModel);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.reasoning) thinkingText += parsed.reasoning;
                if (isMediaModel && parsed.content?.includes('media-container')) {
                  fullResponse = parsed.content;
                } else if (parsed.content) {
                  fullResponse += parsed.content;
                }
                setCurrentResponse(fullResponse);
              } catch (e) {}
            }
          }
        }

        let cleanResponse = fullResponse.replace(/<\d+\/\d+>/g, '').trim();
        let extractedThinking = thinkingText;
        
        const thinkMatch = cleanResponse.match(/<think>([\s\S]*?)<\/think>/);
        if (thinkMatch) {
          extractedThinking = thinkMatch[1].trim();
          cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        }
        
        const hasThinking = extractedThinking && extractedThinking.trim().length > 0;
        
        // Add new version
        const newVersions = [...versions, cleanResponse];
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: cleanResponse, 
          model: lastAssistantMsg.model || selectedModel, 
          mode: lastAssistantMsg.mode || 'normal', 
          thinking: hasThinking ? extractedThinking : undefined,
          versions: newVersions,
          currentVersion: newVersions.length - 1
        }]);
        setCurrentResponse('');
      } catch (error) {
        if (error.name === 'AbortError') {
          if (currentResponse) {
            const cleanResponse = currentResponse.replace(/<\d+\/\d+>/g, '').trim();
            setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse + ' [Stopped]', model: lastAssistantMsg.model || selectedModel }]);
          }
          setCurrentResponse('');
        } else {
          console.error('Error:', error);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditText(messages[index].content);
  };

  const handleSaveEdit = (index) => {
    const updatedMessages = [...messages];
    updatedMessages[index].content = editText;
    setMessages(updatedMessages.slice(0, index + 1));
    setEditingIndex(null);
    if (updatedMessages[index].role === 'user') {
      handleSendMessage(editText, [], selectedModel);
    }
  };

  const handleVersionChange = (index, newVersion) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        currentVersion: newVersion,
        content: updated[index].versions[newVersion]
      };
      return updated;
    });
  };

  const handleCopy = (text, index) => {
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentResponse('');
    setCurrentChatId(null);
    setThinkingPanel(null);
  };

  const handleSelectChat = async (chatId) => {
    const specialModels = ['bytez-image', 'bytez-video', 'bytez-audio', 'bytez-music', 'llm-council'];
    if (specialModels.includes(chatId)) {
      handleNewChat();
      setSelectedModel(chatId);
      return;
    }
    setThinkingPanel(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const chat = await response.json();
        setMessages(chat.messages);
        setCurrentChatId(chatId);
        toast.remove();
        toast.success('Chat loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
      toast.remove();
      toast.error('Failed to load chat');
    }
  };

  const saveChat = async () => {
    if (user?.id === 'guest' || messages.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const messagesToSave = currentResponse && isLoading
        ? [...messages, { role: 'assistant', content: currentResponse + ' [Incomplete]', model: selectedModel }]
        : messages;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: currentChatId,
          messages: messagesToSave,
          title: messages[0]?.content.slice(0, 50) || 'New Chat'
        })
      });
      if (response.ok) {
        const chat = await response.json();
        if (!currentChatId) setCurrentChatId(chat._id);
        // Update cache - move edited chat to top
        const cachedChats = JSON.parse(localStorage.getItem('cachedChats') || '[]');
        const filteredChats = cachedChats.filter(c => c._id !== chat._id);
        const updatedCache = [{ ...chat, updatedAt: new Date().toISOString() }, ...filteredChats].slice(0, 4);
        localStorage.setItem('cachedChats', JSON.stringify(updatedCache));
      }
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  };

  useEffect(() => {
    const loadSharedChat = async () => {
      if (isShared) {
        const token = window.location.pathname.split('/share/')[1];
        setShareToken(token);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat/shared/${token}`);
          if (response.ok) {
            const chat = await response.json();
            setMessages(chat.messages);
          }
        } catch (error) {
          console.error('Failed to load shared chat:', error);
        }
      }
    };
    loadSharedChat();
  }, [isShared]);

  useEffect(() => {
    if (messages.length > 0 && !isShared && !isLoading) {
      const timer = setTimeout(() => saveChat(), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, isShared]);



  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0 && user?.id !== 'guest' && !isShared) {
        saveChat();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, currentChatId, user, isShared]);

  return (
    <div className="flex w-full h-screen bg-black overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1F2023', color: '#fff' } }} />
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar
        user={user}
        onLogout={handleLogout}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId}
        refreshTrigger={messages.length}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'} ${thinkingPanel !== null ? 'lg:mr-[300px]' : ''} h-screen`}>
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 pt-[70px] md:pt-[80px] pb-[120px] md:pb-[140px] scrollbar-thin scrollbar-thumb-black scrollbar-track-black">
        <div className="max-w-[900px] mx-auto space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center px-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  {[
                    `Hello, ${user.name}! 👋`,
                    `Welcome back, ${user.name}! ✨`,
                    `Hi ${user.name}! Ready to chat? 💬`,
                    `Hey ${user.name}! What can I help you with? 🚀`,
                    `Good to see you, ${user.name}! 😊`,
                    `Hello! How can I assist you today? 🤖`,
                    `Welcome! Let's create something amazing! 🎨`,
                    `Hi there! What's on your mind? 💭`,
                    `Ready to explore? Let's get started! 🌟`,
                    `Hello! I'm here to help! 💡`
                  ][Math.floor(Math.random() * 10)]}
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">Start a conversation or ask me anything</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
            const isLastUser = msg.role === 'user' && i === messages.length - 1;
            
            return (
              <div key={i} className="group" ref={isLastUser ? lastUserMessageRef : null}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`space-y-2 ${msg.role === 'user' ? 'max-w-[80%]' : msg.mode === 'canvas' ? 'w-full' : 'max-w-[95%]'}`}>
                    {editingIndex === i ? (
                      <EditMessage
                        value={editText}
                        onChange={setEditText}
                        onSave={() => handleSaveEdit(i)}
                        onCancel={() => setEditingIndex(null)}
                        role={msg.role}
                        onRemoveFile={async () => {
                          if (msg.filePublicId) {
                            try {
                              await fetch(`${import.meta.env.VITE_API_URL}/api/upload/delete`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ publicId: msg.filePublicId })
                              });
                            } catch (e) {
                              console.error('Failed to delete file:', e);
                            }
                          }
                        }}
                      />
                    ) : msg.role === 'assistant' && msg.mode === 'canvas' ? (
                      <CanvasView content={msg.content} />
                    ) : msg.role === 'assistant' && msg.mode === 'think' ? (
                      <ThinkingView content={msg.content} />
                    ) : msg.role === 'assistant' && msg.mode === 'search' ? (
                      <SearchView content={msg.content} />
                    ) : (
                      <MessageBubble 
                        content={msg.content} 
                        role={msg.role} 
                        versions={msg.versions}
                        currentVersion={msg.currentVersion || 0}
                        onVersionChange={(v) => handleVersionChange(i, v)}
                      />
                    )}
                    {msg.thinking && msg.role === 'assistant' && editingIndex !== i && (
                      <button
                        onClick={() => setThinkingPanel(thinkingPanel === i ? null : i)}
                        className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white"
                      >
                        💭 Thinking
                      </button>
                    )}
                  </div>
                </div>
                {!editingIndex && (
                  <MessageActions
                    role={msg.role}
                    isLast={isLastAssistant}
                    isLoading={isLoading}
                    onRegenerate={handleRegenerate}
                    onEdit={() => handleEdit(i)}
                    onCopy={() => handleCopy(msg.content, i)}
                    isCopied={copiedIndex === i}
                    versions={msg.versions}
                    currentVersion={msg.currentVersion || 0}
                    onVersionChange={(v) => handleVersionChange(i, v)}
                  />
                )}
              </div>
            );
          })}
          {isLoading && !currentResponse && loadingState && (
            <div className="flex justify-start">
              <div className="bg-white/5 rounded-2xl px-4 py-3 text-white/70 text-sm">
                <style>{`@keyframes dots{0%,20%{content:''}40%{content:'.'}60%{content:'..'}80%,100%{content:'...'}}`}</style>
                <span>{loadingState.replace('...', '')}<span className="inline-block" style={{animation:'dots 1.5s infinite'}}></span></span>
              </div>
            </div>
          )}
          {currentResponse && !currentResponse.includes('media-container') && (
            <div className="flex justify-start">
              <div className="max-w-[95%]">
                {messages[messages.length - 1]?.mode === 'canvas' ? (
                  <MessageBubble content={currentResponse} role="assistant" />
                ) : messages[messages.length - 1]?.mode === 'think' ? (
                  <ThinkingView content={currentResponse} />
                ) : messages[messages.length - 1]?.mode === 'search' ? (
                  <SearchView content={currentResponse} />
                ) : (
                  <MessageBubble content={currentResponse} role="assistant" />
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className={`fixed bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-sm ${sidebarOpen ? 'lg:left-64' : 'left-0'} ${thinkingPanel !== null ? 'lg:right-[300px]' : 'right-0'} z-10 pb-safe`}>
        <div className={`w-full mx-auto ${thinkingPanel !== null ? 'max-w-[700px]' : 'max-w-[800px]'}`}>
          <PromptInputBox 
            onSend={handleSendMessage} 
            isLoading={isLoading} 
            defaultModel={selectedModel}
            selectedModel={selectedModel}
            onStop={handleStop}
          />
        </div>
      </div>
      </div>
      {thinkingPanel !== null && messages[thinkingPanel]?.thinking && (
        <>
        <div className="fixed right-0 top-0 h-full w-full sm:w-[300px] bg-[#1F2023] border-l border-gray-700 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>💭</span> Thinking Process
            </h3>
            <button
              onClick={() => setThinkingPanel(null)}
              className="text-white hover:bg-white/10 rounded p-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
              {messages[thinkingPanel].thinking}
            </div>
          </div>
        </div>
        {window.innerWidth < 640 && (
          <div
            onClick={() => setThinkingPanel(null)}
            className="fixed inset-0 bg-black/50 z-40"
          />
        )}
        </>
      )}
      <Settings user={user} isOpen={settingsOpen} setIsOpen={setSettingsOpen} onLogout={handleLogout} />
      

    </div>
  );
}

export default App;
